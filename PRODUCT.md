# Farta Admin product direction

Farta Admin is the separate management frontend for the existing Farta Market Laravel API and database. It replaces the admin routes that previously shipped inside the customer storefront. The first and primary surface is product management: browse products, create or edit product details, add gallery images, replace the cover image, delete images, and open the public product page.

The interface inherits Farta Market's established visual system: Be Vietnam Pro, white working surfaces on a pale green background, dark green primary actions, visible text labels, modest borders and radii, and restrained motion. It is an operational tool, so product identity, state, and available actions take priority over decoration.

Desktop keeps the dense product table and opens the editor inline above it. At mobile widths, each product becomes a self-contained row where its thumbnail, name, key metadata, and edit/delete actions remain visible together without horizontal scrolling. Image controls stay grouped at the start of their column and show file constraints, selected previews, progress, success, error, empty, and confirmation states.

All authentication and authorization truth remains on Laravel. Admin and staff sessions are bootstrapped from `/api/admin/me`; a customer role never becomes an admin session. Staff can manage products and images, while destructive product actions and user management remain admin-only.
