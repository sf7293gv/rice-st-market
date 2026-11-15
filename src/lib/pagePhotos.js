// Pages that can show an admin-managed photo gallery (page_photos table, Admin → Page Photos).
// To add a page: list it here, then render <PhotoGallery page="<value>" … /> on that page.
export const PHOTO_PAGES = [
  { value: 'grocery', label: 'Grocery' },
]

// Storage location for uploaded page photos (public "images" bucket).
export const PAGE_PHOTOS_BUCKET = 'images'
export const PAGE_PHOTOS_FOLDER = 'page-photos'
