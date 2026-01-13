// Required to prevent a console window appearing on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    deptox_lib::run()
}
