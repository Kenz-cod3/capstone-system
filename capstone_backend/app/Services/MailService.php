<?php

namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;
use Illuminate\Support\Facades\Log;

class MailService
{
    public static function sendNotificationEmail(
        string $to,
        string $guestName,
        string $bookingReference,
        string $subject,
        string $message
    ): bool {

        $mail = new PHPMailer(true);

        try {

            $mail->isSMTP();
            $mail->Host = env('MAIL_HOST');
            $mail->SMTPAuth = true;
            $mail->Username = env('MAIL_USERNAME');
            $mail->Password = env('MAIL_PASSWORD');
            $mail->SMTPSecure = env('MAIL_ENCRYPTION');
            $mail->Port = env('MAIL_PORT');

            $mail->setFrom(
                env('MAIL_FROM_ADDRESS'),
                env('MAIL_FROM_NAME')
            );

            $mail->addAddress($to);

            $mail->isHTML(true);

            $mail->Subject = $subject;

            $mail->Body = "
                        <!DOCTYPE html>
                        <html>
                        <head>
                        <meta charset='UTF-8'>
                        </head>

                        <body style='margin:0;padding:40px;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;'>

                        <table width='100%' cellpadding='0' cellspacing='0'>
                        <tr>
                        <td align='center'>

                        <table width='650' cellpadding='0' cellspacing='0'
                        style='background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;'>

                        <tr>
                        <td style='background:#1e7a45;padding:25px;text-align:center;'>

                        <h1 style='margin:0;color:#ffffff;'>
                        Lynn Ennia's Travelers Inn
                        </h1>

                        <p style='margin:8px 0 0;color:#dff5e8;'>
                        Booking Reservation System
                        </p>

                        </td>
                        </tr>

                        <tr>
                        <td style='padding:35px;'>

                        <h2 style='color:#1e7a45;margin-top:0;'>
                        {$subject}
                        </h2>

                        <p style='font-size:16px;color:#333;line-height:1.8;'>

                        Hi <strong>{$guestName}</strong>,

                        </p>

                        <p style='font-size:16px;color:#333;line-height:1.8;'>

                        {$message}

                        </p>

                        <p style='font-size:16px;color:#333;line-height:1.8;'>

                        <strong>Booking Reference:</strong><br>
                        {$bookingReference}

                        </p>

                        <hr style='border:none;border-top:1px solid #e5e7eb;margin:30px 0;'>

                        <p style='font-size:15px;color:#555;line-height:1.8;'>

                        Thank you for choosing <strong>Lynn Ennia's Travelers Inn</strong>.

                        We look forward to welcoming you and hope you have a pleasant stay with us.

                        </p>

                        <p style='margin-top:35px;font-size:15px;color:#333;'>

                        Kind regards,<br>
                        <strong>Lyn Enia's Travelers Inn Management</strong>

                        </p>

                        </td>
                        </tr>

                        <tr>
                        <td style='background:#f8f8f8;padding:18px;text-align:center;
                        font-size:12px;color:#777;'>

                        This is an automated email. Please do not reply to this message.

                        </td>
                        </tr>

                        </table>

                        </td>
                        </tr>
                        </table>

                        </body>
                        </html>
                        ";

            $mail->send();

            return true;
        } catch (\Exception $e) {

            Log::error($mail->ErrorInfo);

            return false;
        }
    }
}
