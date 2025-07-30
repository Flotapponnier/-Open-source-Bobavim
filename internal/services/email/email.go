package email

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/ses"
	"gopkg.in/gomail.v2"
)

// Resend API structures
type ResendEmail struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	Html    string   `json:"html"`
}

type ResendResponse struct {
	Id string `json:"id"`
}

type EmailService struct {
	host        string
	port        int
	username    string
	password    string
	from        string
	resendKey   string
	useResend   bool
	useSES      bool
	sesRegion   string
	baseURL     string
	sesClient   *ses.SES
}

type EmailConfig struct {
	Host      string
	Port      int
	Username  string
	Password  string
	From      string
	ResendKey string
	UseResend bool
	UseSES    bool
	SESRegion string
	BaseURL   string
}

func NewEmailService(config EmailConfig) *EmailService {
	es := &EmailService{
		host:      config.Host,
		port:      config.Port,
		username:  config.Username,
		password:  config.Password,
		from:      config.From,
		resendKey: config.ResendKey,
		useResend: config.UseResend,
		useSES:    config.UseSES,
		sesRegion: config.SESRegion,
		baseURL:   config.BaseURL,
	}

	// Initialize SES client if using SES
	if es.useSES {
		sess, err := session.NewSession(&aws.Config{
			Region: aws.String(es.sesRegion),
		})
		if err != nil {
			log.Printf("Failed to create AWS session: %v", err)
		} else {
			es.sesClient = ses.New(sess)
		}
	}

	return es
}

func NewEmailServiceFromEnv() *EmailService {
	resendKey := os.Getenv("RESEND_API_KEY")  
	useSES := os.Getenv("USE_SES") == "true"
	sesRegion := os.Getenv("AWS_REGION")
	host := os.Getenv("SMTP_HOST")
	portStr := os.Getenv("SMTP_PORT")
	username := os.Getenv("SMTP_USERNAME")
	password := os.Getenv("SMTP_PASSWORD")
	from := os.Getenv("SMTP_FROM")
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}
	if from == "" {
		from = "noreply@bobavim.com" // Use verified domain
	}
	if sesRegion == "" {
		sesRegion = "eu-central-1" // Default to Frankfurt
	}

	// Priority: SES > Resend > SMTP
	if useSES {
		es := &EmailService{
			from:      from,
			useSES:    true,
			sesRegion: sesRegion,
			baseURL:   baseURL,
		}
		
		// Initialize SES client
		sess, err := session.NewSession(&aws.Config{
			Region: aws.String(sesRegion),
		})
		if err != nil {
			log.Printf("Failed to create AWS session: %v", err)
		} else {
			es.sesClient = ses.New(sess)
		}
		
		return es
	}

	// If Resend API key is available, use Resend
	if resendKey != "" {
		return &EmailService{
			from:      from,
			resendKey: resendKey,
			useResend: true,
			baseURL:   baseURL,
		}
	}

	// Fallback to SMTP with default values for testing with Gmail
	if host == "" {
		host = "smtp.gmail.com"
	}
	if portStr == "" {
		portStr = "587"
	}
	if from == "" {
		from = username
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		port = 587 // Default SMTP port
	}

	return &EmailService{
		host:      host,
		port:      port,
		username:  username,
		password:  password,
		from:      from,
		resendKey: resendKey,
		useResend: false,
		baseURL:   baseURL,
	}
}

func (es *EmailService) SendPasswordResetEmail(to, resetToken string) error {
	if !es.IsConfigured() {
		log.Printf("Email service not configured - would send reset email to %s with token %s", to, resetToken)
		return nil // Don't fail if email is not configured
	}

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", es.baseURL, resetToken)
	
	subject := "🔓 Boba.vim Password Reset"
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Password Reset - Boba.vim</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #8B4513;">🧋 Boba.vim</h1>
        </div>
        
        <h2 style="color: #333;">Password Reset Request</h2>
        
        <p>Hello!</p>
        
        <p>We received a request to reset your password for your Boba.vim account. If you didn't make this request, you can safely ignore this email.</p>
        
        <p>To reset your password, click the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="%s" style="background-color: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset My Password</a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">%s</p>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
            This link will expire in 1 hour for security reasons.
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="font-size: 12px; color: #888;">
            If you're having trouble clicking the button, copy and paste the URL into your web browser.
        </p>
        
        <p style="font-size: 12px; color: #888;">
            Best regards,<br>
            The Boba.vim Team
        </p>
    </div>
</body>
</html>
`, resetURL, resetURL)

	return es.SendEmail(to, subject, body)
}

func (es *EmailService) SendConfirmationEmail(to, confirmationToken string) error {
	if !es.IsConfigured() {
		log.Printf("Email service not configured - would send confirmation email to %s with token %s", to, confirmationToken)
		return nil // Don't fail if email is not configured
	}

	confirmationURL := fmt.Sprintf("%s/api/auth/confirm-email?token=%s", es.baseURL, confirmationToken)
	
	subject := "🧋 Confirm Your Boba.vim Account"
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Confirm Your Account - Boba.vim</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #8B4513;">🧋 Boba.vim</h1>
        </div>
        
        <h2 style="color: #333;">Welcome to Boba.vim!</h2>
        
        <p>Hello!</p>
        
        <p>Thank you for creating an account with Boba.vim. To get started and access all features, please confirm your email address.</p>
        
        <p><strong>Please confirm your account to have access to all features.</strong></p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="%s" style="background-color: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Confirm My Email</a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">%s</p>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
            You can still play games on Boba.vim, but you won't be able to appear on the leaderboard until you confirm your email address.
        </p>
        
        <p style="font-size: 14px; color: #666;">
            This link will expire in 24 hours for security reasons.
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="font-size: 12px; color: #888;">
            If you're having trouble clicking the button, copy and paste the URL into your web browser.
        </p>
        
        <p style="font-size: 12px; color: #888;">
            Best regards,<br>
            The Boba.vim Team
        </p>
    </div>
</body>
</html>
`, confirmationURL, confirmationURL)

	return es.SendEmail(to, subject, body)
}

func (es *EmailService) SendNewsletterEmail(to, newsletterTitle, newsletterSummary string) error {
	if !es.IsConfigured() {
		log.Printf("Email service not configured - would send newsletter email to %s", to)
		return nil // Don't fail if email is not configured
	}

	subject := fmt.Sprintf("Bobavim Newsletter - %s", newsletterTitle)
	
	// Use production URL for images in emails (so they work regardless of where the app runs)
	imageBaseURL := "https://www.bobavim.com"
	if es.baseURL != "" && es.baseURL != "http://localhost:8080" {
		imageBaseURL = es.baseURL
	}
	
	// Create 8-bit style email template with boba banner
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>%s - Bobavim Newsletter</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        
        .pixel-font {
            font-family: 'Press Start 2P', monospace;
            line-height: 1.6;
        }
        
        .pixel-button {
            background: linear-gradient(45deg, #8B4513, #D2691E);
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border: 3px solid #654321;
            display: inline-block;
            font-family: 'Press Start 2P', monospace;
            font-size: 12px;
            text-transform: uppercase;
            box-shadow: 4px 4px 0px #654321;
            transition: all 0.1s;
        }
        
        .pixel-button:hover {
            transform: translate(2px, 2px);
            box-shadow: 2px 2px 0px #654321;
        }
        
        .banner-container {
            text-align: center;
            background: linear-gradient(45deg, #87CEEB, #4682B4);
            padding: 20px;
            border: 4px solid #2F4F4F;
            margin-bottom: 20px;
        }
        
        .content-box {
            background: #F5F5DC;
            border: 3px solid #8B4513;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 4px 4px 0px #654321;
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFF8DC; font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Banner Section -->
        <div class="banner-container">
            <img src="%s/static/sprites/logo/boba_vim_banner.png" alt="Bobavim Banner" style="max-width: 100%%; height: auto; image-rendering: pixelated;">
        </div>
        
        <!-- Title Section -->
        <div class="content-box">
            <h1 class="pixel-font" style="color: #8B4513; text-align: center; font-size: 16px; margin: 0 0 20px 0;">
                NEW NEWSLETTER
            </h1>
            
            <h2 class="pixel-font" style="color: #654321; text-align: center; font-size: 14px; margin: 0 0 20px 0;">
                %s
            </h2>
        </div>
        
        <!-- Content Preview -->
        <div class="content-box">
            <h3 class="pixel-font" style="color: #8B4513; font-size: 12px; margin: 0 0 15px 0;">
                PREVIEW:
            </h3>
            
            <p style="color: #333; line-height: 1.6; margin: 0 0 20px 0; font-size: 14px;">
                %s
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="%s" class="pixel-button">
                    READ FULL NEWSLETTER
                </a>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="content-box" style="text-align: center;">
            <p class="pixel-font" style="color: #8B4513; font-size: 10px; margin: 0 0 10px 0;">
                BOBAVIM
            </p>
            
            <p style="color: #666; font-size: 12px; margin: 0;">
                Keep practicing those Vim motions!<br>
                Master the art of efficient text editing through play.
            </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
            <p style="font-size: 11px; color: #888;">
                You received this email because you confirmed your email with Bobavim.<br>
                Continue your Vim journey at <a href="%s" style="color: #8B4513;">www.bobavim.com</a>
            </p>
        </div>
    </div>
</body>
</html>
`, newsletterTitle, imageBaseURL, newsletterTitle, newsletterSummary, es.baseURL, es.baseURL)

	return es.SendEmail(to, subject, body)
}

func (es *EmailService) SendEmail(to, subject, body string) error {
	if es.useSES {
		return es.sendEmailViaSES(to, subject, body)
	}
	if es.useResend {
		return es.sendEmailViaResend(to, subject, body)
	}
	return es.sendEmailViaSMTP(to, subject, body)
}

func (es *EmailService) sendEmailViaSMTP(to, subject, body string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", es.from)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)

	d := gomail.NewDialer(es.host, es.port, es.username, es.password)
	d.TLSConfig = &tls.Config{InsecureSkipVerify: true}

	if err := d.DialAndSend(m); err != nil {
		log.Printf("Failed to send email to %s: %v", to, err)
		return fmt.Errorf("failed to send email: %w", err)
	}

	log.Printf("Email sent successfully via SMTP to %s", to)
	return nil
}

func (es *EmailService) IsConfigured() bool {
	if es.useSES {
		return es.sesClient != nil
	}
	if es.useResend {
		return es.resendKey != ""
	}
	return es.username != "" && es.password != ""
}

// sendEmailViaResend sends an email using the Resend API
func (es *EmailService) sendEmailViaResend(to, subject, body string) error {
	email := ResendEmail{
		From:    es.from,
		To:      []string{to},
		Subject: subject,
		Html:    body,
	}

	jsonData, err := json.Marshal(email)
	if err != nil {
		return fmt.Errorf("failed to marshal email data: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+es.resendKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("Resend API error - Status: %d, Body: %s", resp.StatusCode, string(body))
		return fmt.Errorf("resend API returned status %d: %s", resp.StatusCode, string(body))
	}

	log.Printf("Email sent successfully via Resend to %s", to)
	return nil
}

// sendEmailViaSES sends an email using Amazon SES
func (es *EmailService) sendEmailViaSES(to, subject, body string) error {
	if es.sesClient == nil {
		return fmt.Errorf("SES client not initialized")
	}

	input := &ses.SendEmailInput{
		Destination: &ses.Destination{
			ToAddresses: []*string{aws.String(to)},
		},
		Message: &ses.Message{
			Body: &ses.Body{
				Html: &ses.Content{
					Charset: aws.String("UTF-8"),
					Data:    aws.String(body),
				},
			},
			Subject: &ses.Content{
				Charset: aws.String("UTF-8"),
				Data:    aws.String(subject),
			},
		},
		Source: aws.String(es.from),
	}

	result, err := es.sesClient.SendEmail(input)
	if err != nil {
		log.Printf("Failed to send email via SES to %s: %v", to, err)
		return fmt.Errorf("failed to send email via SES: %w", err)
	}

	log.Printf("Email sent successfully via SES to %s (MessageId: %s)", to, *result.MessageId)
	return nil
}