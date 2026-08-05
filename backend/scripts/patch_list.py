with open('frontend/components/admin/AuctionPropertiesList.tsx', 'r') as f:
    code = f.read()

# Make sure we don't call onClose when clicking the Dossier button
code = code.replace('if (onClose) onClose();', '// if (onClose) onClose();')

with open('frontend/components/admin/AuctionPropertiesList.tsx', 'w') as f:
    f.write(code)

print("Patched AuctionPropertiesList successfully!")
