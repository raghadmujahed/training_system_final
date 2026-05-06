<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subject }}</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; direction: rtl; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { background: #4f46e5; padding: 24px 32px; }
        .header h1 { color: #ffffff; margin: 0; font-size: 1.2rem; }
        .body { padding: 32px; color: #1e293b; font-size: 0.95rem; line-height: 1.7; }
        .body p { margin: 0 0 16px; }
        .footer { background: #f8fafc; padding: 16px 32px; color: #94a3b8; font-size: 0.78rem; border-top: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ config('app.name') }}</h1>
        </div>
        <div class="body">
            @if($recipientName)
                <p>عزيزي/عزيزتي {{ $recipientName }}،</p>
            @endif
            <p>{!! nl2br(e($body)) !!}</p>
        </div>
        <div class="footer">
            <p>هذا البريد تلقائي — يُرجى عدم الرد عليه مباشرة.</p>
        </div>
    </div>
</body>
</html>
