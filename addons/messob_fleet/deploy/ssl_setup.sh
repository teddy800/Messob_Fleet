#!/bin/bash
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# SSL/TLS Setup Script (NFR-3.3)
# Description: Automated SSL certificate setup with Let's Encrypt
#
# Features:
#   - Let's Encrypt certificate generation
#   - Automatic renewal setup
#   - DH parameters generation
#   - Certificate validation
# ---------------------------------------------------------------------------

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${DOMAIN:-fleet.mesob.et}"
EMAIL="${EMAIL:-admin@mesob.et}"
SSL_DIR="/etc/nginx/ssl"
CERTBOT_DIR="/var/www/certbot"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}MESSOB Fleet Management - SSL Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root${NC}"
    exit 1
fi

# Create SSL directory
echo -e "${YELLOW}Creating SSL directory...${NC}"
mkdir -p $SSL_DIR
mkdir -p $CERTBOT_DIR

# Generate DH parameters (this takes a while)
if [ ! -f "$SSL_DIR/dhparam.pem" ]; then
    echo -e "${YELLOW}Generating DH parameters (this may take several minutes)...${NC}"
    openssl dhparam -out $SSL_DIR/dhparam.pem 2048
    echo -e "${GREEN}✓ DH parameters generated${NC}"
else
    echo -e "${GREEN}✓ DH parameters already exist${NC}"
fi

# Install certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Installing certbot...${NC}"
    
    # Detect OS and install certbot
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    elif [ -f /etc/redhat-release ]; then
        # RHEL/CentOS
        yum install -y certbot python3-certbot-nginx
    else
        echo -e "${RED}Error: Unsupported OS. Please install certbot manually.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Certbot installed${NC}"
else
    echo -e "${GREEN}✓ Certbot already installed${NC}"
fi

# Option 1: Let's Encrypt (Production)
echo ""
echo -e "${YELLOW}SSL Certificate Options:${NC}"
echo "1) Let's Encrypt (Free, Auto-renewal, Production)"
echo "2) Self-signed (Development/Testing only)"
echo ""
read -p "Choose option (1 or 2): " SSL_OPTION

if [ "$SSL_OPTION" == "1" ]; then
    echo ""
    echo -e "${YELLOW}Obtaining Let's Encrypt certificate...${NC}"
    echo "Domain: $DOMAIN"
    echo "Email: $EMAIL"
    echo ""
    
    # Stop nginx temporarily
    systemctl stop nginx || true
    
    # Obtain certificate
    certbot certonly --standalone \
        --preferred-challenges http \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        -d www.$DOMAIN
    
    # Copy certificates to SSL directory
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_DIR/fullchain.pem
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_DIR/privkey.pem
    cp /etc/letsencrypt/live/$DOMAIN/chain.pem $SSL_DIR/chain.pem
    
    # Set permissions
    chmod 644 $SSL_DIR/fullchain.pem
    chmod 600 $SSL_DIR/privkey.pem
    chmod 644 $SSL_DIR/chain.pem
    
    echo -e "${GREEN}✓ Let's Encrypt certificate obtained${NC}"
    
    # Setup automatic renewal
    echo -e "${YELLOW}Setting up automatic renewal...${NC}"
    
    # Create renewal script
    cat > /etc/cron.daily/certbot-renew << 'EOF'
#!/bin/bash
certbot renew --quiet --post-hook "systemctl reload nginx"
EOF
    
    chmod +x /etc/cron.daily/certbot-renew
    
    echo -e "${GREEN}✓ Automatic renewal configured${NC}"
    
elif [ "$SSL_OPTION" == "2" ]; then
    echo ""
    echo -e "${YELLOW}Generating self-signed certificate...${NC}"
    
    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout $SSL_DIR/privkey.pem \
        -out $SSL_DIR/fullchain.pem \
        -subj "/C=ET/ST=Addis Ababa/L=Addis Ababa/O=MESSOB/CN=$DOMAIN"
    
    # Copy fullchain as chain for consistency
    cp $SSL_DIR/fullchain.pem $SSL_DIR/chain.pem
    
    # Set permissions
    chmod 644 $SSL_DIR/fullchain.pem
    chmod 600 $SSL_DIR/privkey.pem
    chmod 644 $SSL_DIR/chain.pem
    
    echo -e "${GREEN}✓ Self-signed certificate generated${NC}"
    echo -e "${YELLOW}⚠ Warning: Self-signed certificates should only be used for development!${NC}"
    
else
    echo -e "${RED}Invalid option${NC}"
    exit 1
fi

# Verify certificates
echo ""
echo -e "${YELLOW}Verifying certificates...${NC}"

if [ -f "$SSL_DIR/fullchain.pem" ] && [ -f "$SSL_DIR/privkey.pem" ]; then
    # Check certificate validity
    openssl x509 -in $SSL_DIR/fullchain.pem -noout -text | grep -E "Subject:|Issuer:|Not Before|Not After"
    echo ""
    echo -e "${GREEN}✓ Certificates verified${NC}"
else
    echo -e "${RED}Error: Certificate files not found${NC}"
    exit 1
fi

# Update Nginx configuration
echo ""
echo -e "${YELLOW}Updating Nginx configuration...${NC}"

# Backup existing config
if [ -f /etc/nginx/sites-available/odoo ]; then
    cp /etc/nginx/sites-available/odoo /etc/nginx/sites-available/odoo.backup.$(date +%Y%m%d_%H%M%S)
fi

# Copy SSL config
cp "$(dirname "$0")/config/nginx_ssl.conf" /etc/nginx/sites-available/odoo

# Enable site
ln -sf /etc/nginx/sites-available/odoo /etc/nginx/sites-enabled/odoo

# Test Nginx configuration
echo -e "${YELLOW}Testing Nginx configuration...${NC}"
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx configuration valid${NC}"
    
    # Restart Nginx
    echo -e "${YELLOW}Restarting Nginx...${NC}"
    systemctl restart nginx
    echo -e "${GREEN}✓ Nginx restarted${NC}"
else
    echo -e "${RED}Error: Nginx configuration test failed${NC}"
    exit 1
fi

# Test SSL configuration
echo ""
echo -e "${YELLOW}Testing SSL configuration...${NC}"
echo "Testing TLS 1.3 connection..."

# Wait for Nginx to start
sleep 2

# Test SSL connection
if command -v openssl &> /dev/null; then
    echo "" | openssl s_client -connect localhost:443 -tls1_3 2>&1 | grep -E "Protocol|Cipher"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ TLS 1.3 connection successful${NC}"
    else
        echo -e "${YELLOW}⚠ TLS 1.3 test inconclusive (may need external testing)${NC}"
    fi
fi

# Final summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}SSL/TLS Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Configuration:"
echo "  Domain: $DOMAIN"
echo "  SSL Directory: $SSL_DIR"
echo "  TLS Version: 1.3"
echo "  HSTS: Enabled (1 year)"
echo ""

if [ "$SSL_OPTION" == "1" ]; then
    echo "Certificate Info:"
    echo "  Type: Let's Encrypt"
    echo "  Auto-renewal: Enabled (daily check)"
    echo "  Renewal command: certbot renew"
    echo ""
fi

echo "Next Steps:"
echo "  1. Update DNS records to point $DOMAIN to this server"
echo "  2. Test HTTPS access: https://$DOMAIN"
echo "  3. Test SSL rating: https://www.ssllabs.com/ssltest/"
echo ""

if [ "$SSL_OPTION" == "2" ]; then
    echo -e "${YELLOW}⚠ Remember: Self-signed certificates will show browser warnings${NC}"
    echo -e "${YELLOW}   For production, use Let's Encrypt (option 1)${NC}"
    echo ""
fi

echo -e "${GREEN}Setup completed successfully!${NC}"
