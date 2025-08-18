import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.hostinger.com",
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true, // true for SSL port 465, false for TLS 587
      auth: {
        user: process.env.SMTP_USER || "admin@eventsh.com",
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // ✉️ Send to Admin when a new role application is submitted
  async sendApprovalRequestToAdmin(data: {
    name: string;
    email: string;
    role: string;
  }) {
    await this.transporter.sendMail({
      from: `"EventSH" <${process.env.SMTP_USER}>`,
      to: "admin@eventsh.com", // admin email
      subject: `Approval Request for New ${data.role}`,
      html: `
        <h1>Approval Needed</h1>
        <p>User <strong>${data.name}</strong> (${data.email}) has applied for the role of <strong>${data.role}</strong>.</p>
        <p>Please log in to the admin dashboard to approve or reject this request.</p>
      `,
    });
  }

  // ✉️ Send to applicant confirming their request is pending
  async sendConfirmationToUser(data: {
    name: string;
    email: string;
    role: string;
  }) {
    await this.transporter.sendMail({
      from: `"EventSH" <${process.env.SMTP_USER}>`,
      to: data.email,
      subject: `Your ${data.role} Registration is Pending`,
      html: `
        <h1>Hello ${data.name},</h1>
        <p>Thank you for applying to become a ${data.role} on our platform.</p>
        <p>Your request has been sent to the admin team for approval. You will receive an email once it's approved.</p>
        <p>Regards,<br/>EventSH Team</p>
      `,
    });
  }

  // ✉️ Send status update email (Approved or Rejected)
  async sendStatusUpdate(data: {
    name: string;
    email: string;
    role: string;
    status: "Approved" | "Rejected";
  }) {
    let subject = "";
    let body = "";

    if (data.status === "Approved") {
      subject = `Your ${data.role} Registration is Approved`;
      body = `
        <h1>Congratulations ${data.name}!</h1>
        <p>We are pleased to inform you that your application for the role of <strong>${data.role}</strong> has been 
        <span style="color: green; font-weight: bold;">Approved</span>.</p>
        <p>You can now log in and access your ${data.role} dashboard to start managing your activities.</p>
        <p>Regards,<br/>EventSH Team</p>
      `;
    } else if (data.status === "Rejected") {
      subject = `Your ${data.role} Registration is Rejected`;
      body = `
        <h1>Hello ${data.name},</h1>
        <p>We regret to inform you that your application for the role of <strong>${data.role}</strong> has been 
        <span style="color: red; font-weight: bold;">Rejected</span>.</p>
        <p>If you believe this is a mistake or would like to appeal, please contact our support team.</p>
        <p>Regards,<br/>EventSH Team</p>
      `;
    }

    await this.transporter.sendMail({
      from: `"EventSH" <${process.env.SMTP_USER}>`,
      to: data.email,
      subject,
      html: body,
    });
  }

  // ✉️ Send email when a new admin is created
  async sendNewAdminCredentials(data: {
    name: string;
    email: string;
    password: string;
    createdBy: string;
  }) {
    const subject = "Welcome to EventSH - Your Admin Account";

    const body = `
    <h1>Welcome, ${data.name}!</h1>
    <p>You have been added as an <strong>Admin</strong> on the <strong>EventSH</strong> platform by <strong>${data.createdBy}</strong>.</p>
    <h2>Your Login Credentials:</h2>
    <ul>
      <li><strong>Email:</strong> ${data.email}</li>
      <li><strong>Temporary Password:</strong> ${data.password}</li>
    </ul>
    <p><strong>Note:</strong> Please log in immediately and change your password from your profile settings.</p>
    <p>Access the Admin Dashboard here: <a href="http://your-admin-dashboard-url.com">Login Now</a></p>
    <br/>
    <p>Best regards,<br/>EventSH Team</p>
  `;

    await this.transporter.sendMail({
      from: `"EventSH" <${process.env.SMTP_USER}>`,
      to: data.email,
      subject,
      html: body,
    });
  }
}
