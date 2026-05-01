export async function sendEmail(to, subject, htmlContent) {
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, html: htmlContent })
        });
        return response.ok;
    } catch (error) {
        console.error('Email error:', error);
        return false;
    }
}

export async function sendWelcomeEmail(email, name) {
    return sendEmail(email, 'Welcome to ODUSBABA!', `
        <h1>Welcome ${name}!</h1>
        <p>Thank you for joining ODUSBABA.</p>
        <a href="https://www.bluskyeconsult.com/dashboard">Get Started</a>
    `);
}

export async function sendPasswordResetEmail(email, resetLink) {
    return sendEmail(email, 'Reset Your Password', `
        <h1>Password Reset Request</h1>
        <p>Click <a href="${resetLink}">here</a> to reset your password.</p>
        <p>This link expires in 1 hour.</p>
    `);
}

export async function sendJobAlertEmail(email, jobs) {
    const jobList = jobs.map(j => `<li><strong>${j.title}</strong> at ${j.company}</li>`).join('');
    return sendEmail(email, 'New Jobs Matching Your Alert', `
        <h1>New Jobs Available!</h1>
        <ul>${jobList}</ul>
        <a href="https://www.bluskyeconsult.com/jobs">View All Jobs</a>
    `);
}
