@echo off
REM Demo script to upload terms using the upload_terms.py script
REM Make sure you're in the backend directory before running this

echo 🔧 Homis Terms Upload Demo
echo ==========================

REM Check if we're in the right directory
if not exist "upload_terms.py" (
    echo ❌ Error: upload_terms.py not found!
    echo 💡 Make sure you're running this script from the backend directory
    pause
    exit /b 1
)

REM Check if sample files exist
if not exist "sample_terms_he.html" (
    echo ❌ Error: sample_terms_he.html not found!
    pause
    exit /b 1
)

if not exist "sample_terms_en.html" (
    echo ❌ Error: sample_terms_en.html not found!
    pause
    exit /b 1
)

echo 📁 Found sample terms files:
echo   - sample_terms_he.html
echo   - sample_terms_en.html
echo.

echo 🚀 Uploading terms to database...
echo Command: python upload_terms.py --hebrew sample_terms_he.html --english sample_terms_en.html --title "תנאי שימוש v1.0" --description "Initial terms and conditions"
echo.

REM Run the upload script
python upload_terms.py --hebrew sample_terms_he.html --english sample_terms_en.html --title "תנאי שימוש v1.0" --description "Initial terms and conditions"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✨ Upload completed successfully!
    echo 🌐 Your terms are now available at:
    echo   - Hebrew: /terms/he
    echo   - English: /terms/en
    echo   - Default: /terms
    echo.
    echo 🔧 Next steps:
    echo   1. Start your Flask app
    echo   2. Test the endpoints in your browser
    echo   3. Check the React Native app for terms acceptance
) else (
    echo.
    echo 💥 Upload failed!
    echo Please check the error messages above.
)

echo.
pause
