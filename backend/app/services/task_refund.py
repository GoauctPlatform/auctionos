from datetime import datetime, timezone
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.core.email import send_email
from app.models.realtor_task import RealtorTask
from app.models.user import User

logger = logging.getLogger(__name__)

async def check_and_refund_overdue_tasks(db: Session) -> None:
    """
    Scans for realtor tasks where expiration_date < now, and status is not approved,
    refunded, or cancelled. Issues automated Stripe refunds, sends alert emails,
    and removes the task record.
    """
    now = datetime.now(timezone.utc)
    
    # Query overdue tasks that are not approved, refunded or cancelled
    overdue_tasks = (
        db.query(RealtorTask)
        .filter(RealtorTask.expiration_date != None)
        .filter(RealtorTask.expiration_date < now)
        .filter(~RealtorTask.status.in_(["approved", "refunded", "cancelled"]))
        .all()
    )

    if not overdue_tasks:
        logger.info("No overdue tasks found for automated escrow refunds.")
        return

    logger.info(f"Found {len(overdue_tasks)} overdue task(s) for automated escrow refunds.")

    for task in overdue_tasks:
        try:
            logger.info(f"Processing overdue refund for Task ID {task.id} (reward: {task.reward_points} pts)")
            
            # 1. Stripe Escrow Refund Flow
            refund_successful = False
            charge_id = task.stripe_charge_id
            refund_amount_usd = task.reward_points / 100.0

            if charge_id:
                if settings.STRIPE_SECRET_KEY:
                    try:
                        import stripe
                        stripe.api_key = settings.STRIPE_SECRET_KEY
                        
                        if charge_id.startswith("cs_"):
                            # Retrieve Checkout Session to get PaymentIntent ID
                            session = stripe.checkout.Session.retrieve(charge_id)
                            pi_id = getattr(session, "payment_intent", None)
                            if pi_id:
                                stripe.Refund.create(payment_intent=pi_id)
                                refund_successful = True
                                logger.info(f"Stripe Refund issued for Checkout Session {charge_id} (PI: {pi_id})")
                            else:
                                logger.error(f"Could not find PaymentIntent for Checkout Session {charge_id}")
                        elif charge_id.startswith("pi_"):
                            stripe.Refund.create(payment_intent=charge_id)
                            refund_successful = True
                            logger.info(f"Stripe Refund issued for PaymentIntent {charge_id}")
                        else:
                            stripe.Refund.create(charge=charge_id)
                            refund_successful = True
                            logger.info(f"Stripe Refund issued for Charge/PaymentIntent {charge_id}")
                    except Exception as stripe_err:
                        logger.error(
                            f"Stripe Refund failed for Task ID {task.id}, charge {charge_id}: {stripe_err}",
                            exc_info=True,
                            extra={"task_id": task.id, "charge_id": charge_id}
                        )
                else:
                    # Mock flow success when Stripe secret key is not set
                    refund_successful = True
                    logger.info(f"Mock Mode: Stripe not configured. Simulating escrow escrow refund of ${refund_amount_usd:.2f} for Task ID {task.id}")
            else:
                logger.warning(f"No stripe_charge_id found for Task ID {task.id}. Proceeding with email alerts and task deletion.")
                refund_successful = True # No Stripe charge to refund, continue to delete/alert

            # 2. Retrieve investor details
            investor = None
            if task.investor_user_id:
                investor = db.query(User).filter(User.id == task.investor_user_id).first()

            # 3. Send email to client/investor
            if investor:
                email_body = f"""
                <h2>GoAuct Escrow Automated Refund</h2>
                <p>Hello {investor.full_name or investor.email},</p>
                <p>We are writing to inform you that your due diligence field task (<strong>{task.title}</strong>) has passed its escrow expiration deadline of {task.expiration_date.strftime('%Y-%m-%d %H:%M:%S UTC')} without completion.</p>
                <p>As per our service SLA, we have automatically cancelled this task, cleared the escrow, and initiated a full refund of <strong>${refund_amount_usd:.2f}</strong> back to your original payment method.</p>
                <p>Depending on your financial institution, refunds usually appear in your account within 5 to 10 business days.</p>
                <p>If you have any questions or would like to re-publish the task, please let us know.</p>
                <br/>
                <p>Best regards,</p>
                <p><strong>GoAuct Operations Team</strong></p>
                """
                await send_email(
                    subject=f"GoAuct: Overdue Task Escrow Automated Refund - {task.title}",
                    recipients=[investor.email],
                    body=email_body
                )

            # 4. Send email to GoAuct support (support@goauct.com)
            support_email_body = f"""
            <h2>System Alert: Overdue Escrow Refund Processed</h2>
            <p><strong>Task ID:</strong> {task.id}</p>
            <p><strong>Task Title:</strong> {task.title}</p>
            <p><strong>Investor User:</strong> {investor.email if investor else 'Unknown'} (ID: {task.investor_user_id})</p>
            <p><strong>Refund Amount:</strong> ${refund_amount_usd:.2f}</p>
            <p><strong>Stripe Charge ID:</strong> {task.stripe_charge_id or 'None'}</p>
            <p><strong>Refund Status:</strong> {'SUCCESSFUL' if refund_successful else 'FAILED (Stripe error / Pending manual check)'}</p>
            <p><strong>Expiration Deadline:</strong> {task.expiration_date.strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
            <p>The task has been deleted from the active queue.</p>
            """
            await send_email(
                subject=f"System Alert: Overdue Escrow Refund Processed - Task {task.id}",
                recipients=["support@goauct.com"],
                body=support_email_body
            )

            # 5. Delete task from database
            db.delete(task)
            db.commit()
            logger.info(f"Successfully processed overdue escrow refund and deleted Task ID {task.id}")

        except Exception as task_err:
            db.rollback()
            logger.error(
                f"Failed to process overdue task refund for Task ID {task.id}: {task_err}",
                exc_info=True,
                extra={"task_id": task.id}
            )
