use std::fs;
use std::path::PathBuf;
use tempfile::TempDir;

pub struct TestFixture {
    pub temp_dir: TempDir,
}

impl TestFixture {
    pub fn new() -> Self {
        Self {
            temp_dir: TempDir::new().expect("Failed to create temp directory"),
        }
    }

    pub fn path(&self) -> PathBuf {
        self.temp_dir.path().to_path_buf()
    }

    pub fn create_node_modules(
        &self,
        name: &str,
        file_count: usize,
        bytes_per_file: usize,
    ) -> PathBuf {
        let project_dir = self.temp_dir.path().join(name);
        let node_modules = project_dir.join("node_modules");
        fs::create_dir_all(&node_modules).expect("Failed to create node_modules");

        for index in 0..file_count {
            let file_path = node_modules.join(format!("file_{}.txt", index));
            let content = "x".repeat(bytes_per_file);
            fs::write(&file_path, content).expect("Failed to write file");
        }

        node_modules
    }

    pub fn create_nested_structure(&self) -> Vec<PathBuf> {
        let mut node_modules_paths = Vec::new();

        let path = self.create_node_modules("project-a", 5, 1000);
        node_modules_paths.push(path);

        let workspace = self.temp_dir.path().join("workspace");
        fs::create_dir_all(&workspace).expect("Failed to create workspace");
        let project_b = workspace.join("project-b").join("node_modules");
        fs::create_dir_all(&project_b).expect("Failed to create project-b node_modules");
        fs::write(project_b.join("package.json"), "{}").expect("Failed to write file");
        node_modules_paths.push(project_b);

        let deep = self
            .temp_dir
            .path()
            .join("deep")
            .join("nested")
            .join("project-c");
        let project_c = deep.join("node_modules");
        fs::create_dir_all(&project_c).expect("Failed to create project-c node_modules");
        for index in 0..3 {
            fs::write(
                project_c.join(format!("dep_{}.js", index)),
                "module.exports = {};",
            )
            .expect("Failed to write file");
        }
        node_modules_paths.push(project_c);

        node_modules_paths
    }

    pub fn create_nested_node_modules(&self) -> PathBuf {
        let project = self.temp_dir.path().join("nested-project");
        let outer_node_modules = project.join("node_modules");
        let inner_node_modules = outer_node_modules.join("some-package").join("node_modules");

        fs::create_dir_all(&inner_node_modules).expect("Failed to create nested node_modules");
        fs::write(outer_node_modules.join("index.js"), "// outer").expect("Failed to write file");
        fs::write(inner_node_modules.join("index.js"), "// inner").expect("Failed to write file");

        outer_node_modules
    }
}

impl Default for TestFixture {
    fn default() -> Self {
        Self::new()
    }
}

pub fn calculate_actual_directory_size(path: &PathBuf) -> u64 {
    let mut total_size: u64 = 0;

    if path.is_dir() {
        for entry in fs::read_dir(path).expect("Failed to read directory") {
            let entry = entry.expect("Failed to get entry");
            let entry_path = entry.path();

            if entry_path.is_file() {
                total_size += entry.metadata().expect("Failed to get metadata").len();
            } else if entry_path.is_dir() {
                total_size += calculate_actual_directory_size(&entry_path);
            }
        }
    }

    total_size
}

#[cfg(test)]
#[path = "test_helpers.test.rs"]
mod tests;
