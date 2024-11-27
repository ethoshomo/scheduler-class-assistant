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
    if platform.system() == "Windows":
        binary_dir = os.path.join(base_path, "front/src-tauri/binaries")
    else:
        binary_dir = os.path.join(base_path, "front/src-tauri/binaries")

    os.makedirs(binary_dir, exist_ok=True)
    print(f"Created directory: {binary_dir}")
    return binary_dir


def compile_genetic(target_dir: str):
    """Compile the genetic algorithm"""
    print("Compiling genetic algorithm...")
    genetic_source = os.path.join(os.path.dirname(__file__), "genetic.py")

    common_options = ["--onefile", "--clean"]

    subprocess.run(
        ["pyinstaller", *common_options, "--name", "genetic", genetic_source],
        check=True,
    )

    # Move the executable with platform-specific name
    if platform.system() == "Windows":
        source = os.path.join(os.path.dirname(__file__), "dist", "genetic.exe")
        target_name = "genetic-x86_64-pc-windows-msvc.exe"
    else:
        source = os.path.join(os.path.dirname(__file__), "dist", "genetic")
        target_name = "genetic-x86_64-unknown-linux-gnu"

    target = os.path.join(target_dir, target_name)
    shutil.move(source, target)

    # Set executable permissions on Linux
    if platform.system() != "Windows":
        os.chmod(target, 0o755)

    print(f"Created genetic algorithm executable: {target}")


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
            linear_source,
        ],
        check=True,
    )

    # Move the executables with platform-specific names
    if platform.system() == "Windows":
        source = os.path.join(os.path.dirname(__file__), "dist", "linear.exe")
        target_name = "linear-x86_64-pc-windows-msvc.exe"
        cbc_target_name = "cbc-x86_64-pc-windows-msvc.exe"
    else:
        source = os.path.join(os.path.dirname(__file__), "dist", "linear")
        target_name = "linear-x86_64-unknown-linux-gnu"
        cbc_target_name = "cbc-x86_64-unknown-linux-gnu"

    target = os.path.join(target_dir, target_name)
    shutil.move(source, target)

    # Copy CBC solver with platform-specific name
    cbc_target = os.path.join(target_dir, cbc_target_name)
    shutil.copy2(cbc_path, cbc_target)

    # Set executable permissions on Linux
    if platform.system() != "Windows":
        os.chmod(cbc_target, 0o755)
        os.chmod(target, 0o755)

    print(f"Created linear algorithm executable: {target}")
    print(f"Copied CBC solver to: {cbc_target}")


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
        target_dir = create_directories()
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
