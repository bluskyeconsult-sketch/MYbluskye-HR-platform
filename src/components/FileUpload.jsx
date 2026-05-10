// src/components/FileUpload.jsx
// Reusable file upload component for admin functions (books, courses, assessments)

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, FileText, Image, Loader2, CheckCircle } from 'lucide-react';

const ACCEPTED_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    csv: ['text/csv', 'application/vnd.ms-excel'],
    all: ['*']
};

export default function FileUpload({ 
    bucket = 'admin_uploads', 
    folder = 'general',
    acceptedType = 'all',
    maxSizeMB = 10,
    onUploadComplete,
    onUploadError,
    multiple = false,
    label = 'Upload File',
    existingUrl = null
}) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadedUrls, setUploadedUrls] = useState(existingUrl ? [existingUrl] : []);
    const [error, setError] = useState(null);

    const handleUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        setUploading(true);
        setError(null);
        setProgress(0);

        const validFiles = files.filter(file => {
            const maxBytes = maxSizeMB * 1024 * 1024;
            if (file.size > maxBytes) {
                setError(`${file.name} exceeds ${maxSizeMB}MB limit`);
                return false;
            }
            if (acceptedType !== 'all') {
                const allowedTypes = ACCEPTED_TYPES[acceptedType] || ACCEPTED_TYPES.all;
                if (!allowedTypes.includes(file.type) && acceptedType !== 'all') {
                    setError(`${file.name} type not allowed`);
                    return false;
                }
            }
            return true;
        });

        const uploaded = [];
        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `${folder}/${Date.now()}_${i}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            setProgress(((i) / validFiles.length) * 50);
            
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (uploadError) {
                setError(uploadError.message);
                continue;
            }
            
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);
            
            uploaded.push(publicUrl);
            setProgress(((i + 1) / validFiles.length) * 100);
        }
        
        const newUrls = multiple ? [...uploadedUrls, ...uploaded] : uploaded;
        setUploadedUrls(newUrls);
        
        if (onUploadComplete) {
            onUploadComplete(multiple ? newUrls : newUrls[0]);
        }
        
        setUploading(false);
        setProgress(0);
    };

    const removeFile = (index) => {
        const newUrls = [...uploadedUrls];
        newUrls.splice(index, 1);
        setUploadedUrls(newUrls);
        if (onUploadComplete) {
            onUploadComplete(multiple ? newUrls : newUrls[0] || null);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? 'Uploading...' : label}
                    <input
                        type="file"
                        onChange={handleUpload}
                        disabled={uploading}
                        multiple={multiple}
                        accept={acceptedType === 'image' ? 'image/*' : acceptedType === 'document' ? '.pdf,.doc,.docx' : '*'}
                        className="hidden"
                    />
                </label>
                {uploading && (
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                )}
            </div>
            
            {error && <p className="text-red-400 text-sm">{error}</p>}
            
            {uploadedUrls.length > 0 && (
                <div className="space-y-2">
                    {uploadedUrls.map((url, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg">
                            <div className="flex items-center gap-2">
                                {url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                                    <Image className="w-4 h-4 text-primary-400" />
                                ) : (
                                    <FileText className="w-4 h-4 text-primary-400" />
                                )}
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-400 hover:underline truncate max-w-xs">
                                    {url.split('/').pop()}
                                </a>
                            </div>
                            <button onClick={() => removeFile(idx)} className="p-1 text-slate-400 hover:text-red-400 transition">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
