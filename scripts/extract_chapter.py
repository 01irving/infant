import fitz  # PyMuPDF

doc = fitz.open("/home/z/my-project/upload/370532045-Pediatric-Nutrition-in-Practice-pdf.pdf")

# Chapter 1.2 is pages 21-28 (0-indexed: 20-27)
# Basic Anthropometry starts at page 23 (0-indexed: 22)

print("=" * 100)
print("CHAPTER 1.2 - NUTRITIONAL ASSESSMENT (Pages 21-28)")
print("=" * 100)

for page_num in range(20, 28):  # pages 21-28 (0-indexed)
    page = doc[page_num]
    text = page.get_text("text")
    print(f"\n{'─' * 100}")
    print(f"PAGE {page_num + 1}")
    print(f"{'─' * 100}")
    print(text)

doc.close()
