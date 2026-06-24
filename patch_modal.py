with open('frontend/components/admin/AuctionWorkspaceModal.tsx', 'r') as f:
    code = f.read()

# Modify the Dialog props
target = """<Dialog 
            open={isOpen} 
            onClose={onClose} 
            maxWidth="xl" 
            fullWidth 
            sx={{ zIndex: 90000 }}
            PaperProps={{ sx: { height: '90vh', maxHeight: '90vh', borderRadius: 4, overflow: 'hidden' } }}
        >"""

replacement = """<Dialog 
            open={isOpen} 
            onClose={(event, reason) => {
                if (reason !== 'backdropClick') {
                    onClose();
                }
            }}
            maxWidth="xl" 
            fullWidth 
            hideBackdrop={true}
            disableEnforceFocus={true}
            disableScrollLock={true}
            sx={{ zIndex: 90000, pointerEvents: 'none' }}
            PaperProps={{ sx: { height: '90vh', maxHeight: '90vh', borderRadius: 4, overflow: 'hidden', pointerEvents: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' } }}
        >"""

code = code.replace(target, replacement)

with open('frontend/components/admin/AuctionWorkspaceModal.tsx', 'w') as f:
    f.write(code)

print("Patched AuctionWorkspaceModal Dialog successfully!")
