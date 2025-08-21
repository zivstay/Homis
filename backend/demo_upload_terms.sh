#!/bin/bash

# Demo script to upload terms using the upload_terms.py script
# Make sure you're in the backend directory before running this

echo "🔧 Homis Terms Upload Demo"
echo "=========================="

# Check if we're in the right directory
if [ ! -f "upload_terms.py" ]; then
    echo "❌ Error: upload_terms.py not found!"
    echo "💡 Make sure you're running this script from the backend directory"
    exit 1
fi

# Check if sample files exist
if [ ! -f "sample_terms_he.html" ] || [ ! -f "sample_terms_en.html" ]; then
    echo "❌ Error: Sample terms files not found!"
    echo "💡 Make sure sample_terms_he.html and sample_terms_en.html exist"
    exit 1
fi

echo "📁 Found sample terms files:"
echo "  - sample_terms_he.html"
echo "  - sample_terms_en.html"
echo ""

echo "🚀 Uploading terms to database..."
echo "Command: python upload_terms.py --hebrew sample_terms_he.html --english sample_terms_en.html --title \"תנאי שימוש v1.0\" --description \"Initial terms and conditions\""
echo ""

# Run the upload script
python upload_terms.py \
    --hebrew sample_terms_he.html \
    --english sample_terms_en.html \
    --title "תנאי שימוש v1.0" \
    --description "Initial terms and conditions"

if [ $? -eq 0 ]; then
    echo ""
    echo "✨ Upload completed successfully!"
    echo "🌐 Your terms are now available at:"
    echo "  - Hebrew: /terms/he"
    echo "  - English: /terms/en"
    echo "  - Default: /terms"
    echo ""
    echo "🔧 Next steps:"
    echo "  1. Start your Flask app"
    echo "  2. Test the endpoints in your browser"
    echo "  3. Check the React Native app for terms acceptance"
else
    echo ""
    echo "💥 Upload failed!"
    echo "Please check the error messages above."
fi
