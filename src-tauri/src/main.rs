// Windows release build mein console window na khule
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    jadoo_lib::run();
}
