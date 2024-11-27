import os
import platform
import shutil
import subprocess
from pulp import PULP_CBC_CMD
import site
import glob
import argparse


def find_cbc_executable():
    """Find the CBC executable in the PuLP package"""
    try:
        # First try getting it directly from PuLP
        solver = PULP_CBC_CMD()
        if hasattr(solver, "path") and os.path.exists(solver.path):
            return solver.path
    except:
        pass

    # Search in site-packages if the solver path isn't directly accessible
    site_packages = site.getsitepackages()

    # Possible CBC executable names
    if platform.system() == "Windows":
        cbc_names = ["cbc.exe"]
    else:
        cbc_names = ["cbc"]

    # Search patterns
    patterns = [
        os.path.join("pulp", "solverdir", "cbc", "*"),
        os.path.join("pulp", "apis", "*"),
        os.path.join("pulp", "*"),
        os.path.join("coin_or_cbc", "*"),
    ]

    for site_pkg in site_packages:
        for pattern in patterns:
            for cbc_name in cbc_names:
                full_pattern = os.path.join(site_pkg, pattern, cbc_name)
                matches = glob.glob(full_pattern, recursive=True)
                for match in matches:
                    if os.path.isfile(match) and os.access(match, os.X_OK):
                        return match

    raise Exception("Could not find CBC executable in Python environment")


def create_directories():
    base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    directories = [
        os.path.join(base_path, "front/src-tauri/binaries/x86_64-pc-windows-msvc"),
        os.path.join(base_path, "front/src-tauri/binaries/x86_64-unknown-linux-gnu"),
    ]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"Created directory: {directory}")


def compile_genetic(target_dir: str):
    """Compile the genetic algorithm"""
    print("Compiling genetic algorithm...")
    genetic_source = os.path.join(os.path.dirname(__file__), "genetic.py")

    common_options = ["--onefile", "--clean"]

    subprocess.run(
        ["pyinstaller", *common_options, "--name", "genetic", genetic_source],
        check=True,
    )

    # Move the executable
    source_name = "genetic.exe" if platform.system() == "Windows" else "genetic"
    source = os.path.join(os.path.dirname(__file__), "dist", source_name)
    target = os.path.join(target_dir, source_name)
    shutil.move(source, target)

    # Set executable permissions on Linux
    if platform.system() != "Windows":
        os.chmod(target, 0o755)

    print(f"Created genetic algorithm executable in: {target_dir}")


def compile_linear(target_dir: str):
    """Compile the linear algorithm"""
    print("Compiling linear algorithm...")
    linear_source = os.path.join(os.path.dirname(__file__), "linear.py")

    # Find CBC solver
    try:
        cbc_path = find_cbc_executable()
        print(f"Found CBC solver at: {cbc_path}")
    except Exception as e:
        print(f"Error: {str(e)}")
        raise

    common_options = ["--onefile", "--clean"]
    linear_options = [
        "--hidden-import=pulp",
        "--hidden-import=pulp.apis",
        "--hidden-import=pulp.apis.coin_api",
        "--collect-all=pulp",
        f"--add-binary={cbc_path}{os.pathsep}.",
    ]

    subprocess.run(
        [
            "pyinstaller",
            *common_options,
            *linear_options,
            "--name",
            "linear",
            # "--debug=all",
            linear_source,
        ],
        check=True,
    )

    # Move the executables
    source_name = "linear.exe" if platform.system() == "Windows" else "linear"
    source = os.path.join(os.path.dirname(__file__), "dist", source_name)
    target = os.path.join(target_dir, source_name)
    shutil.move(source, target)

    # Copy CBC solver and set permissions on Linux
    if platform.system() != "Windows":
        cbc_target = os.path.join(target_dir, "cbc")
        shutil.copy2(cbc_path, cbc_target)
        os.chmod(cbc_target, 0o755)
        os.chmod(target, 0o755)
        print(f"Copied CBC solver to: {cbc_target}")

    print(f"Created linear algorithm executable in: {target_dir}")


def cleanup():
    """Clean up PyInstaller artifacts"""
    print("Cleaning up build artifacts...")
    build_dir = os.path.join(os.path.dirname(__file__), "build")
    dist_dir = os.path.join(os.path.dirname(__file__), "dist")

    for spec_file in ["genetic.spec", "linear.spec"]:
        spec_path = os.path.join(os.path.dirname(__file__), spec_file)
        if os.path.exists(spec_path):
            os.remove(spec_path)
            print(f"Removed {spec_file}")

    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)
        print("Removed build directory")
    if os.path.exists(dist_dir):
        shutil.rmtree(dist_dir)
        print("Removed dist directory")


def get_target_directory():
    """Get the target directory based on platform"""
    base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if platform.system() == "Windows":
        return os.path.join(
            base_path, "front/src-tauri/binaries/x86_64-pc-windows-msvc"
        )
    else:
        return os.path.join(
            base_path, "front/src-tauri/binaries/x86_64-unknown-linux-gnu"
        )


def main():
    parser = argparse.ArgumentParser(
        description="Build executables for the scheduler application."
    )
    parser.add_argument(
        "--genetic", action="store_true", help="Build only the genetic algorithm"
    )
    parser.add_argument(
        "--linear", action="store_true", help="Build only the linear algorithm"
    )
    args = parser.parse_args()

    try:
        # If no specific algorithm is selected, build both
        build_both = not (args.genetic or args.linear)

        print("Creating directories...")
        create_directories()

        target_dir = get_target_directory()
        print(f"Target directory: {target_dir}")

        # Change to the script's directory for PyInstaller
        os.chdir(os.path.dirname(__file__))

        if args.genetic or build_both:
            compile_genetic(target_dir)

        if args.linear or build_both:
            compile_linear(target_dir)

        cleanup()
        print("Build completed successfully!")

    except Exception as e:
        print(f"Error during build: {str(e)}")
        cleanup()
        exit(1)


if __name__ == "__main__":
    main()
