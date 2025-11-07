// pages/api/undoUpload.js
// Temporary stub — undo not implemented yet.
// Prevents the dashboard from crashing.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const { uploadId } = req.body;

    return res.status(200).json({
      success: false,
      error: "Undo not implemented yet."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error while undoing upload."
    });
  }
}
