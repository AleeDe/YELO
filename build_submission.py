"""Assemble a clean submission folder and zip it for the instructor.

Usage:
    python build_submission.py

Produces:
    submission/YELO_Submission/     the folder, ready to inspect
    submission/YELO_Submission.zip  the file to upload

Everything is copied, never moved, so the working repository is untouched.
Build output (node_modules, .next, out, android build artifacts) is excluded,
which keeps the archive small enough to upload.
"""

import os
import shutil
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(ROOT, "submission")
PKG_NAME = "YELO_Submission"
PKG = os.path.join(OUT_DIR, PKG_NAME)

# Directories never copied, wherever they appear.
SKIP_DIRS = {
    "node_modules", ".next", "out", ".git", "__pycache__", ".venv", "venv",
    "build", ".gradle", ".idea", "submission", ".temp", "runs",
}

# Files never copied.
SKIP_FILES = {
    ".env", ".env.local", "tsconfig.tsbuildinfo", ".DS_Store", "Thumbs.db",
}

SKIP_SUFFIXES = (".log", ".pyc", ".apk")


def ignore(directory, names):
    """shutil.copytree filter."""
    dropped = []
    for name in names:
        full = os.path.join(directory, name)
        if os.path.isdir(full):
            if name in SKIP_DIRS:
                dropped.append(name)
        else:
            if name in SKIP_FILES or name.endswith(SKIP_SUFFIXES):
                dropped.append(name)
    return dropped


def copy_tree(src_rel, dst_rel):
    src = os.path.join(ROOT, src_rel)
    dst = os.path.join(PKG, dst_rel)
    if not os.path.exists(src):
        print(f"  SKIP (missing): {src_rel}")
        return
    shutil.copytree(src, dst, ignore=ignore, dirs_exist_ok=True)
    print(f"  copied dir : {src_rel}")


def copy_file(src_rel, dst_rel=None):
    src = os.path.join(ROOT, src_rel)
    dst = os.path.join(PKG, dst_rel or src_rel)
    if not os.path.exists(src):
        print(f"  SKIP (missing): {src_rel}")
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    print(f"  copied file: {src_rel}")


def dir_size_mb(path):
    total = 0
    for base, _, files in os.walk(path):
        for name in files:
            try:
                total += os.path.getsize(os.path.join(base, name))
            except OSError:
                pass
    return total / (1024 * 1024)


def main():
    if os.path.exists(PKG):
        shutil.rmtree(PKG)
    os.makedirs(PKG, exist_ok=True)

    print("Assembling submission package...\n")

    print("1. Documents")
    for name in [
        "PROJECT_REPORT.pdf",       # only if the user has exported it
        "PROJECT_REPORT.html",
        "PROJECT_REPORT.md",
        "AI_USAGE_DECLARATION.md",
        "DATASET.md",
        "README.md",
        "requirements.txt",
    ]:
        copy_file(name, os.path.join("01_Documents", name))

    print("\n2. Trained model")
    copy_file(os.path.join("models", "yolo_garbage.pt"),
              os.path.join("02_Model", "yolo_garbage.pt"))
    copy_file(os.path.join("models", "README.md"),
              os.path.join("02_Model", "README.md"))

    print("\n3. Training notebook")
    copy_file(os.path.join("docs", "colab_train_garbage.ipynb"),
              os.path.join("03_Training", "colab_train_garbage.ipynb"))
    copy_file(os.path.join("docs", "COLAB_TRAINING_PLAN.md"),
              os.path.join("03_Training", "COLAB_TRAINING_PLAN.md"))

    print("\n4. Source code")
    copy_tree("services", os.path.join("04_Source_Code", "services"))
    copy_tree("apps", os.path.join("04_Source_Code", "apps"))
    copy_tree("supabase", os.path.join("04_Source_Code", "supabase"))
    copy_file("requirements.txt",
              os.path.join("04_Source_Code", "requirements.txt"))
    copy_file(".gitignore", os.path.join("04_Source_Code", ".gitignore"))

    print("\n5. Project documentation")
    for name in ["DATABASE_DESIGN.md", "DEMO_RUNBOOK.md",
                 "WEEK_01_PROJECT_PLAN.md", "WEEK_02_BACKLOG.md",
                 "WEEK_03_BACKLOG.md", "WEEK_04_FIELD_TEST.md"]:
        copy_file(os.path.join("docs", name),
                  os.path.join("05_Documentation", name))

    print("\n6. Videos")
    videos = [
        (r"C:\Users\muham\AppData\Local\CapCut\Videos\0726_compressed.mp4",
         "APP_WALKTHROUGH_DEMO.mp4"),
        (r"C:\Users\muham\Downloads"
         r"\Beyond_the_Bounding_Box__Engineering_a_Temporal_Event_Detector.mp4",
         "AI_GENERATED_OVERVIEW.mp4"),
    ]
    for src, dst_name in videos:
        dst = os.path.join(PKG, "06_Videos", dst_name)
        if os.path.exists(src):
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
            print(f"  copied file: {dst_name}")
        else:
            print(f"  SKIP (missing): {src}")

    print("\n7. Android app")
    copy_file(os.path.join("artifacts", "YELO-v1.0.0.apk"),
              os.path.join("07_Android_App", "YELO-v1.0.0.apk"))

    print("\n8. Assets")
    copy_file(os.path.join("assets", "uok-logo.png"),
              os.path.join("01_Documents", "assets", "uok-logo.png"))

    # Top-level index so the folder explains itself.
    index = """YELO - AI-Assisted Littering Detection
=======================================

CS-551 Artificial Intelligence
Department of Computer Science, University of Karachi (BSCS)
Instructor: Sir Rana Zaeem Tariq
Submission date: 26 July 2026

GROUP MEMBERS
-------------
1. Muhammad Ali (Team Lead)   B23110006087
2. Muneeb Roshan              B23110006125
3. Abdur Rahman               B23110006005
4. Arhum Farooq               B23110006017
5. Sami Ullah                 B23110006146

LIVE APPLICATION
----------------
https://yelo-murex.vercel.app/landing.html

The dashboard is deployed on Vercel and can be explored in any browser.

SOURCE CODE REPOSITORY
----------------------
https://github.com/AleeDe/YELO

The full source is included in this package (04_Source_Code/), and is also
on GitHub with the complete commit history showing how the project was
developed week by week.


WHAT IS IN THIS PACKAGE
-----------------------

01_Documents/
    PROJECT_REPORT.pdf          The project report (start here)
    PROJECT_REPORT.html         Same report, browser version
    README.md                   Full setup and usage instructions
    AI_USAGE_DECLARATION.md     Declaration of AI tool usage
    DATASET.md                  Dataset source, download link, licence
    requirements.txt            Python dependencies

02_Model/
    yolo_garbage.pt             Our trained model (22 MB, 1 class: 'trash')
    README.md                   Model details and how to load it

03_Training/
    colab_train_garbage.ipynb   Training notebook WITH ALL OUTPUTS PRESERVED
                                (already executed - no need to run it)
    COLAB_TRAINING_PLAN.md      Training plan and procedure

04_Source_Code/
    services/inference/         Python inference gateway (the AI service)
    apps/dashboard/             Next.js review dashboard
    supabase/                   Database schema and edge functions

    The complete source is also on GitHub, including the full commit
    history of the project (56+ commits across four weeks):

        https://github.com/AleeDe/YELO

    Build output (node_modules, .next, android build files) is excluded
    from this archive to keep it small.

05_Documentation/
    DATABASE_DESIGN.md          Database schema design
    DEMO_RUNBOOK.md             How to run a live demonstration
    WEEK_01..04                 Weekly planning and field-test records

06_Videos/
    APP_WALKTHROUGH_DEMO.mp4    Screen-recorded walkthrough of the full
                                application (recorded by the team)
    AI_GENERATED_OVERVIEW.mp4   AI-generated explainer video (declared in
                                01_Documents/AI_USAGE_DECLARATION.md)

07_Android_App/
    YELO-v1.0.0.apk             Android app (installable APK). The same
                                dashboard is also live in the browser at
                                https://yelo-murex.vercel.app/landing.html


DATASET
-------
The dataset (TACO, approximately 1-2 GB) is too large to include here.
Download link and full details are in 01_Documents/DATASET.md


QUICK RESULTS SUMMARY
---------------------
Model      : YOLOv8s fine-tuned on TACO (transfer learning)
Dataset    : TACO v16, approximately 3,597 images, single 'trash' class
Training   : 50 epochs, image size 640, batch 16, Google Colab free T4 GPU

mAP@0.5        0.513
mAP@0.5:0.95   0.366
Precision      0.713
Recall         0.436

Inference: approximately 75 ms per frame (13 FPS) on CPU at 480 px


HOW TO RUN
----------
Full instructions are in 01_Documents/README.md

Quick test of the model alone (no backend required):

    pip install -r 01_Documents/requirements.txt
    python -c "from ultralytics import YOLO; YOLO('02_Model/yolo_garbage.pt').predict('photo.jpg', save=True, conf=0.25)"

The annotated result is written to runs/detect/predict/


NOTE ON BUILD FILES
-------------------
node_modules/, .next/ and android build output are excluded to keep this
archive small. Run 'npm install' inside 04_Source_Code/apps/dashboard to
restore them.
"""
    with open(os.path.join(PKG, "START_HERE.txt"), "w",
              encoding="utf-8", newline="\r\n") as handle:
        handle.write(index)
    print("\n  wrote START_HERE.txt")

    size = dir_size_mb(PKG)
    print(f"\nPackage assembled: {size:.1f} MB")

    print("Creating zip archive...")
    zip_path = os.path.join(OUT_DIR, PKG_NAME + ".zip")
    if os.path.exists(zip_path):
        os.remove(zip_path)

    count = 0
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED,
                         compresslevel=6) as archive:
        for base, _, files in os.walk(PKG):
            for name in files:
                full = os.path.join(base, name)
                rel = os.path.join(PKG_NAME,
                                   os.path.relpath(full, PKG))
                archive.write(full, rel)
                count += 1

    zip_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"\nDone.")
    print(f"  Folder : submission/{PKG_NAME}/   ({size:.1f} MB, {count} files)")
    print(f"  Archive: submission/{PKG_NAME}.zip ({zip_mb:.1f} MB)")

    pdf = os.path.join(PKG, "01_Documents", "PROJECT_REPORT.pdf")
    if not os.path.exists(pdf):
        print("\n  REMINDER: PROJECT_REPORT.pdf is not in the package yet.")
        print("  Open PROJECT_REPORT.html in a browser, print to PDF, save it")
        print("  to the repository root, then run this script again.")


if __name__ == "__main__":
    main()
