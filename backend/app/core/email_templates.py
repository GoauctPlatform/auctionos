from app.core.config import settings

def get_base_template(content: str) -> str:
    """
    Base HTML wrapper for all GoAuct emails to ensure consistent branding.
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #f8fafc;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
                        <tr>
                            <td style="background: linear-gradient(135deg, #0A84FF 0%, #12B3B6 100%); padding: 40px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">GoAuct</h1>
                                <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">Real Estate Intelligence OS</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px;">
                                {content}
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color: #f1f5f9; padding: 24px; text-align: center;">
                                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                    &copy; 2026 GoAuct Intelligence. All rights reserved.
                                </p>
                                <div style="margin-top: 12px;">
                                    <a href="{settings.FRONTEND_URL}" style="color: #0A84FF; text-decoration: none; font-size: 12px;">Visit Platform</a>
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def get_welcome_template(user_name: str) -> str:
    content = f"""
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Welcome to GoAuct, {user_name}!</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
            Thank you for joining the most advanced real estate auction intelligence platform. Your account is now active and ready to help you find the best opportunities.
        </p>
        <div style="background-color: #f8fafc; border-radius: 16px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
            <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 16px; font-weight: 700;">What's next?</h3>
            <ul style="color: #64748b; font-size: 14px; line-height: 20px; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Explore the <strong>Auctions</strong> dashboard to see live events.</li>
                <li style="margin-bottom: 8px;">Add properties to your <strong>My List</strong> to receive alerts.</li>
                <li>Set up your <strong>Company Profile</strong> to collaborate with your team.</li>
            </ul>
        </div>
        <div style="text-align: center;">
            <a href="{settings.FRONTEND_URL}/#/login" style="display: inline-block; background-color: #0A84FF; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(10, 132, 255, 0.2);">
                Get Started
            </a>
        </div>
    """
    return get_base_template(content)

def get_team_invite_template(invitee_name: str, inviter_name: str, company_name: str, role: str) -> str:
    content = f"""
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">You've been invited!</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
            Hi <strong>{invitee_name}</strong>, you have been added to <strong>{company_name}</strong> as a <strong>{role}</strong> by {inviter_name}.
        </p>
        <div style="background-color: #f0f9ff; border-left: 4px solid #0A84FF; padding: 16px; margin-bottom: 32px;">
            <p style="color: #0369a1; font-size: 14px; line-height: 20px; margin: 0;">
                Collaborate with your team, manage tasks, and track auction results in real-time.
            </p>
        </div>
        <div style="text-align: center;">
            <a href="{settings.FRONTEND_URL}/#/login" style="display: inline-block; background-color: #0A84FF; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px;">
                Join your Team
            </a>
        </div>
    """
    return get_base_template(content)

def get_plan_upgrade_template(user_name: str, plan_name: str) -> str:
    content = f"""
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Plan Upgraded Successfully!</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
            Congratulations <strong>{user_name}</strong>! Your account has been upgraded to the <strong>{plan_name}</strong>.
        </p>
        <div style="background: linear-gradient(to right, #eff6ff, #f0fdfa); border-radius: 16px; padding: 24px; margin-bottom: 32px;">
            <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 16px; font-weight: 700;">New Features Unlocked:</h3>
            <ul style="color: #64748b; font-size: 14px; line-height: 20px; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Unlimited Property Exports</li>
                <li style="margin-bottom: 8px;">Advanced Due Diligence Tasks</li>
                <li>Priority Support and Notifications</li>
            </ul>
        </div>
        <div style="text-align: center;">
            <a href="{settings.FRONTEND_URL}/#/dashboard" style="display: inline-block; background-color: #0A84FF; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px;">
                Go to Dashboard
            </a>
        </div>
    """
    return get_base_template(content)

def get_new_auctions_template(auctions_list: list) -> str:
    """
    auctions_list is a list of dicts: [{'name': str, 'county': str, 'state': str, 'date': str}]
    """
    rows = ""
    for auction in auctions_list[:5]:  # Show top 5
        rows += f"""
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 0;">
                <div style="font-weight: 700; color: #0f172a; font-size: 14px;">{auction['name']}</div>
                <div style="font-size: 12px; color: #94a3b8;">{auction['county']}, {auction['state']}</div>
            </td>
            <td style="padding: 12px 0; text-align: right; color: #0A84FF; font-weight: 700; font-size: 14px;">
                {auction['date']}
            </td>
        </tr>
        """
    
    content = f"""
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">New Opportunities Found!</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
            Our intelligence engine just identified new auctions added to the system. Here are the latest highlights:
        </p>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
            {rows}
        </table>
        <div style="text-align: center;">
            <a href="{settings.FRONTEND_URL}/#/auctions" style="display: inline-block; background-color: #0A84FF; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px;">
                View All New Auctions
            </a>
        </div>
    """
    return get_base_template(content)

def get_auction_reminder_template(address: str, date: str, days: int) -> str:
    content = f"""
        <div style="background-color: #fff7ed; border-radius: 16px; padding: 16px; margin-bottom: 24px; text-align: center; border: 1px solid #ffedd5;">
            <span style="color: #9a3412; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Upcoming Auction Alert</span>
        </div>
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">7 Days Remaining</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
            The property at <strong>{address}</strong> is scheduled for auction on <strong>{date}</strong>. This is the perfect time to finalize your Due Diligence.
        </p>
        <div style="background-color: #f8fafc; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">Address:</p>
            <p style="color: #0f172a; font-size: 18px; font-weight: 700; margin: 4px 0 0 0;">{address}</p>
        </div>
        <div style="text-align: center;">
            <a href="{settings.FRONTEND_URL}/#/my-list" style="display: inline-block; background-color: #0A84FF; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px;">
                Review Property Details
            </a>
        </div>
    """
    return get_base_template(content)

def get_task_update_template(task_title: str, status: str, updated_by: str) -> str:
    status_color = "#10b981" if status.lower() in ["completed", "reviewed"] else "#0A84FF"
    
    content = f"""
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Task Update</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
            The task <strong>"{task_title}"</strong> has been updated to <span style="color: {status_color}; font-weight: 700;">{status.upper()}</span> by {updated_by}.
        </p>
        <div style="text-align: center;">
            <a href="{settings.FRONTEND_URL}/#/tasks" style="display: inline-block; border: 2px solid #0A84FF; color: #0A84FF; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px;">
                View Task Status
            </a>
        </div>
    """
    return get_base_template(content)


def get_verification_email_template(name: str, verification_link: str) -> str:
    content = f"""
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Verify Your Email</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
            Hi {name},<br><br>
            Welcome to GoAuct! To start using your account and access our real estate intelligence tools, please verify your email address by clicking the button below.
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
            <a href="{verification_link}" style="display: inline-block; background-color: #0A84FF; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(10, 132, 255, 0.2);">
                Verify Email Address
            </a>
        </div>
        <p style="color: #94a3b8; font-size: 14px; line-height: 20px; margin: 0;">
            If you didn't create an account with GoAuct, you can safely ignore this email.
        </p>
    """
    return get_base_template(content)


def get_partner_decision_template(name: str, role: str, status: str, reason: str = None) -> str:
    is_approved = status == "verified"
    title = "Application Approved!" if is_approved else "Update on your Application"
    color = "#10b981" if is_approved else "#ef4444"
    
    content = f"""
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">{title}</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
            Hi {name},<br><br>
            Thank you for applying to be a <strong>{role.replace('_', ' ').capitalize()}</strong> on GoAuct.<br><br>
            We have reviewed your profile and your application has been: <strong style="color: {color};">{status.upper()}</strong>.
        </p>
    """
    
    if is_approved:
        content += f"""
            <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
                Congratulations! Your account has been upgraded. You now have access to your dedicated partner portal where you can manage listings and tasks.
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
                <a href="{settings.FRONTEND_URL}" style="display: inline-block; background-color: #0A84FF; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(10, 132, 255, 0.2);">
                    Log In to Your Portal
                </a>
            </div>
        """
    else:
        reason_html = ""
        if reason:
            reason_html = f"""
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                    <strong style="color: #991b1b; font-size: 14px; display: block; margin-bottom: 8px;">Compliance Feedback / Rejection Reason:</strong>
                    <p style="color: #7f1d1d; font-size: 15px; margin: 0; line-height: 22px;">"{reason}"</p>
                </div>
            """
        content += f"""
            {reason_html}
            <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
                Unfortunately, we cannot approve your application at this time. If you believe this is a mistake or would like to provide more information, please contact our support team.
            </p>
        """
        
    return get_base_template(content)


def get_task_rejected_by_investor_template(realtor_name: str, task_title: str, notes: str) -> str:
    content = f"""
        <h2 style="color: #ef4444; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Task Revision Required</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
            Hi {realtor_name},<br><br>
            The investor has reviewed your submission for the task <strong>"{task_title}"</strong> and requested a revision.
        </p>
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 32px;">
            <strong style="color: #991b1b; font-size: 14px; display: block; margin-bottom: 8px;">Investor's Feedback:</strong>
            <p style="color: #7f1d1d; font-size: 15px; margin: 0; line-height: 22px;">"{notes}"</p>
        </div>
        <p style="color: #64748b; font-size: 15px; margin-bottom: 32px;">
            Please review the comments, collect any missing/corrected evidence or photos, and resubmit the task as soon as possible.
        </p>
        <div style="text-align: center;">
            <a href="{settings.FRONTEND_URL}/#/realtor/tasks" style="display: inline-block; background-color: #0A84FF; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px;">
                Open Partner Portal
            </a>
        </div>
    """
    return get_base_template(content)


def get_task_resubmitted_by_realtor_template(investor_name: str, realtor_name: str, task_title: str) -> str:
    content = f"""
        <h2 style="color: #10b981; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Task Resubmitted!</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
            Hi {investor_name},<br><br>
            The field agent <strong>{realtor_name}</strong> has resubmitted the task <strong>"{task_title}"</strong> with the requested updates.
        </p>
        <p style="color: #64748b; font-size: 15px; margin-bottom: 32px;">
            Please log in to your dashboard to review the updated photos, checklist, and notes.
        </p>
        <div style="text-align: center;">
            <a href="{settings.FRONTEND_URL}/#/client/tasks" style="display: inline-block; background-color: #0A84FF; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px;">
                Review Submission
            </a>
        </div>
    """
    return get_base_template(content)


def get_task_mediation_initiated_template(user_name: str, task_title: str) -> str:
    content = f"""
        <h2 style="color: #f59e0b; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Task Sent to Admin Mediation</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
            Hi {user_name},<br><br>
            The task <strong>"{task_title}"</strong> has been rejected for a second time.
        </p>
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 32px;">
            <p style="color: #78350f; font-size: 15px; margin: 0; line-height: 22px;">
                As per platform guidelines, this task has now entered <strong>Admin Mediation</strong>. A GoAuct administrator will audit the submitted property checklist, notes, and photos against the task criteria to resolve the conflict fairly.
            </p>
        </div>
        <p style="color: #64748b; font-size: 15px;">
            No further action is required from you at this time. You will receive an automated email as soon as the administrator makes a final decision.
        </p>
    """
    return get_base_template(content)


def get_task_mediation_resolved_template(user_name: str, task_title: str, decision: str, admin_notes: str) -> str:
    decision_text = "APPROVED (Field Agent credited)" if decision == "approve_realtor" else "REJECTED (Investor refunded)"
    color = "#10b981" if decision == "approve_realtor" else "#ef4444"
    bg_color = "#f0fdf4" if decision == "approve_realtor" else "#fef2f2"
    border_color = "#10b981" if decision == "approve_realtor" else "#ef4444"
    
    content = f"""
        <h2 style="color: {color}; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Mediation Resolution</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
            Hi {user_name},<br><br>
            A GoAuct administrator has finalized the mediation audit for the task <strong>"{task_title}"</strong>.
        </p>
        <div style="background-color: {bg_color}; border: 1px solid {border_color}; padding: 24px; border-radius: 12px; margin-bottom: 32px;">
            <span style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Official Decision:</span>
            <div style="font-size: 20px; font-weight: 800; color: {color}; margin: 4px 0 16px 0;">{decision_text}</div>
            
            <span style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Admin's Audit Notes:</span>
            <p style="font-size: 15px; color: #1e293b; margin: 4px 0 0 0; line-height: 22px;">"{admin_notes}"</p>
        </div>
        <p style="color: #64748b; font-size: 14px; margin: 0;">
            If you have any questions, please reach out to GoAuct support.
        </p>
    """
    return get_base_template(content)
