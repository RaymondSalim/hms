import {z} from 'zod';

// Valid image MIME type for any image
const validImageTypePattern = /^image\/.*/;

// Function to validate Base64 image
const base64ImageValidation = z.string().refine((base64String) => {
    if (!base64String) return false; // Ensure a value is provided
    // Decode the base64 string to get the binary data
    const matches = base64String.match(/^data:(.*);base64,(.*)$/);
    if (!matches || matches.length < 3) return false; // Not a valid base64 format

    const mimeType = matches[1]; // Get MIME type
    const data = matches[2]; // Get the base64 data
    const buffer = Buffer.from(data, 'base64'); // Convert base64 to Buffer

    // Create a File-like object
    const file = new File([buffer], 'image', {type: mimeType});

    return validImageTypePattern.test(file.type); // Validate the file type against the pattern
}, {
    message: "File harus berupa gambar (JPEG, PNG, GIF, dll).",
});

// Step validation schema
export const stepValidationSetupSchema = z.object({
    companyName: z.string().optional(), // Optional for step validation
    locationName: z.string().optional(), // Optional for step validation
    locationAddress: z.string().optional(), // Optional for step validation
    companyImage: z.string().optional().refine((base64String) => {
        if (!base64String) return true; // Skip validation if the string is empty
        return base64ImageValidation.safeParse(base64String).success;
    }),
});

// Final validation schema
export const finalValidationSetupSchema = z.object({
    companyName: z.string().min(1, {message: "Nama perusahaan harus diisi."}),  // Required for final validation    companyImage: base64ImageValidation,
    companyImage: z.string().refine((base64String) => {
        if (!base64String) return false; // Skip validation if the string is empty
        return base64ImageValidation.safeParse(base64String).success;
    }),
    locationName: z.string().min(1, {message: "Nama lokasi harus diisi."}),     // Required for final validation
    locationAddress: z.string().min(1, {message: "Alamat lokasi harus diisi."}), // Required for final validation
});
