use crate::scanner::core::calculate_dir_size_full;
use crate::scanner::types::DependencyCategory;
use crossbeam_channel::{bounded, Receiver, Sender};
use std::io;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use tracing::{debug, error};

pub struct SizeCalculationResult {
    pub path: String,
    pub category: DependencyCategory,
    pub total_size: u64,
    pub file_count: usize,
    pub last_modified_ms: u64,
    pub has_only_symlinks: bool,
}

struct SizeCalculationRequest {
    path: String,
    category: DependencyCategory,
}

pub struct SizeCalculatorPool {
    sender: Option<Sender<SizeCalculationRequest>>,
    result_receiver: Receiver<SizeCalculationResult>,
    shutdown_flag: Arc<AtomicBool>,
    #[allow(dead_code)]
    workers: Vec<JoinHandle<()>>,
}

impl SizeCalculatorPool {
    pub fn new(num_threads: usize) -> Result<Self, io::Error> {
        let (request_sender, request_receiver) = bounded::<SizeCalculationRequest>(256);
        let (result_sender, result_receiver) = bounded::<SizeCalculationResult>(256);
        let shutdown_flag = Arc::new(AtomicBool::new(false));

        let request_receiver = Arc::new(request_receiver);
        let mut workers = Vec::with_capacity(num_threads);

        for worker_index in 0..num_threads {
            let receiver = Arc::clone(&request_receiver);
            let sender = result_sender.clone();
            let shutdown = Arc::clone(&shutdown_flag);

            let handle = thread::Builder::new()
                .name(format!("size-calc-{}", worker_index))
                .spawn(move || {
                    Self::worker_loop(receiver, sender, shutdown);
                })
                .map_err(|error| {
                    error!(
                        worker_index,
                        %error,
                        "Failed to spawn size calculator worker thread"
                    );
                    error
                })?;

            workers.push(handle);
        }

        debug!(num_threads = num_threads, "Size calculator pool created");

        Ok(Self {
            sender: Some(request_sender),
            result_receiver,
            shutdown_flag,
            workers,
        })
    }

    fn worker_loop(
        receiver: Arc<Receiver<SizeCalculationRequest>>,
        sender: Sender<SizeCalculationResult>,
        shutdown: Arc<AtomicBool>,
    ) {
        while !shutdown.load(Ordering::Relaxed) {
            match receiver.recv() {
                Ok(request) => {
                    if shutdown.load(Ordering::Relaxed) {
                        break;
                    }

                    let size_result = calculate_dir_size_full(Path::new(&request.path));

                    let result = SizeCalculationResult {
                        path: request.path,
                        category: request.category,
                        total_size: size_result.total_size,
                        file_count: size_result.file_count,
                        last_modified_ms: size_result.last_modified_ms,
                        has_only_symlinks: size_result.has_only_symlinks,
                    };

                    if let Err(error) = sender.send(result) {
                        debug!(
                            path = %error.0.path,
                            "Failed to send size calculation result - receiver dropped"
                        );
                        break;
                    }
                }
                Err(error) => {
                    debug!(%error, "Worker receive channel closed");
                    break;
                }
            }
        }
    }

    pub fn submit(&self, path: String, category: DependencyCategory) -> bool {
        if let Some(ref sender) = self.sender {
            sender
                .send(SizeCalculationRequest { path, category })
                .is_ok()
        } else {
            false
        }
    }

    pub fn results(&self) -> &Receiver<SizeCalculationResult> {
        &self.result_receiver
    }

    pub fn shutdown(&mut self) {
        self.shutdown_flag.store(true, Ordering::SeqCst);
        self.sender.take();
    }

    #[allow(dead_code)]
    pub fn join(mut self) {
        for worker in self.workers.drain(..) {
            let _ = worker.join();
        }
    }
}

impl Drop for SizeCalculatorPool {
    fn drop(&mut self) {
        self.shutdown_flag.store(true, Ordering::SeqCst);
        self.sender.take();
    }
}

#[cfg(test)]
#[path = "size_pool.test.rs"]
mod tests;
