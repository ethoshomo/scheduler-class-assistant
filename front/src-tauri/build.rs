fn main() {
    tauri_build::build();

    // Copy the appropriate binary based on the target platform
    println!("cargo:rerun-if-changed=binaries");
}
