import os
import platform
import shutil
import subprocess


def create_directories():
    # Get the path to front/src-tauri/binaries relative to the script location
    base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    directories = [
        os.path.join(base_path, "front/src-tauri/binaries/x86_64-pc-windows-msvc"),
        os.path.join(base_path, "front/src-tauri/binaries/x86_64-unknown-linux-gnu"),
    ]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"Created directory: {directory}")


def compile_for_platform():
    current_platform = platform.system()
    # Get the absolute path to test.py in the same directory as this script
    source_file = os.path.join(os.path.dirname(__file__), "test.py")
    # Get the path to front/src-tauri relative to the script location
    base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    # Change to the script's directory for PyInstaller
    os.chdir(os.path.dirname(__file__))

    print(f"Compiling {source_file}")

    if current_platform == "Windows":
        # Compile for Windows
        subprocess.run(
            ["pyinstaller", "--onefile", "--clean", "--name", "back", source_file],
            check=True,
        )

        # Move the executable to the correct directory
        target_path = os.path.join(
            base_path, "front/src-tauri/binaries/x86_64-pc-windows-msvc/back.exe"
        )
        shutil.move(
            os.path.join(os.path.dirname(__file__), "dist/back.exe"), target_path
        )
        print(f"Created Windows executable at: {target_path}")

    elif current_platform == "Linux":
        # Compile for Linux
        subprocess.run(
            ["pyinstaller", "--onefile", "--clean", "--name", "back", source_file],
            check=True,
        )

        # Move the executable to the correct directory
        target_path = os.path.join(
            base_path, "front/src-tauri/binaries/x86_64-unknown-linux-gnu/back"
        )
        shutil.move(os.path.join(os.path.dirname(__file__), "dist/back"), target_path)
        print(f"Created Linux executable at: {target_path}")

    # Clean up PyInstaller artifacts
    build_dir = os.path.join(os.path.dirname(__file__), "build")
    dist_dir = os.path.join(os.path.dirname(__file__), "dist")
    spec_file = os.path.join(os.path.dirname(__file__), "back.spec")

    shutil.rmtree(build_dir, ignore_errors=True)
    shutil.rmtree(dist_dir, ignore_errors=True)
    if os.path.exists(spec_file):
        os.remove(spec_file)


def main():
    try:
        print("Creating directories...")
        create_directories()

        print(f"Compiling for {platform.system()}...")
        compile_for_platform()

        print("Build completed successfully!")

    except Exception as e:
        print(f"Error during build: {str(e)}")
        exit(1)


if __name__ == "__main__":
    main()
