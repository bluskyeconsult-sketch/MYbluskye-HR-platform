// src/pages/api/contact.js
// API endpoint for contact form submissions

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, subject, message } = req.body;

  // Validate required fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Save to database
    const { error: dbError } = await supabase
      .from('contact_messages')
      .insert({
        name: name,
        email: email,
        subject: subject,
        message: message,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (dbError && dbError.code !== '42P01') {
      // Table might not exist, that's okay
      console.warn('Could not save to database:', dbError);
    }

    // Send email notification using your configured email service
    const emailResponse = await fetch(`${process.env.VERCEL_URL || 'https://www.bluskyeconsult.com'}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'support@bluskyeconsult.com',
        subject: `Contact Form: ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Contact Form Submission</h2>
            <p><strong>From:</strong> ${name} (${email})</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <div style="background: #f4f4f4; padding: 15px; border-radius: 8px;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <hr>
            <p style="font-size: 12px; color: #666;">Submitted from ODUSBABA contact page</p>
          </div>
        `,
        replyTo: email
      })
    });

    // Also send auto-reply to user
    await fetch(`${process.env.VERCEL_URL || 'https://www.bluskyeconsult.com'}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: 'We received your message - ODUSBABA',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #fff; padding: 20px; border-radius: 16px;">
            <h1 style="color: #10b981;">Thank you for reaching out!</h1>
            <p>Dear ${name},</p>
            <p>We have received your message and our team will respond within 24 hours.</p>
            <p><strong>Your message was about:</strong> ${subject}</p>
            <hr style="border-color: #1e293b;">
            <p style="font-size: 12px; color: #94a3b8;">In the meantime, you can chat with ODUSBABA AI for immediate assistance using the chat widget on our website.</p>
            <p style="font-size: 12px; color: #475569;">BluSkye Integrated Consult - Creating Value for Partnership</p>
          </div>
        `
      })
    });

    return res.status(200).json({ success: true, message: 'Message sent successfully' });

  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
}
