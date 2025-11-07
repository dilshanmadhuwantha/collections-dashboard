// pages/api/getUploads.js
// Temporary safe stub — returns an empty list so the Uploads page
// loads without crashing. We can connect this to Airtable later.

export default async function handler(req, res) {
  try {
    return res.status(200).json({
      success: true,
      data: []  // no upload history yet
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error while loading uploads."
    });
  }
}
