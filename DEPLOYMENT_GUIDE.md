# 🚀 Production Deployment Guide for 1on1.website

## 📋 Pre-Deployment Checklist

✅ **What You Need:**
- DigitalOcean Droplet IP address
- SSH access to your server
- Terminal/Command Line access

## 🎯 **Deployment Options**

### **Option A: Automated Deployment (Recommended)**

1. **Edit the deployment script:**
   ```bash
   nano deploy_to_production.sh
   ```
   
2. **Replace `YOUR_SERVER_IP` with your actual DigitalOcean IP:**
   ```bash
   SERVER_IP="123.456.789.123"  # Your actual IP
   ```

3. **Run the deployment:**
   ```bash
   ./deploy_to_production.sh
   ```

### **Option B: Manual Deployment**

#### **Step 1: Find Your DigitalOcean IP**
```bash
# Check your DigitalOcean dashboard or use:
dig 1on1.website
```

#### **Step 2: Backup Current Site**
```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Create backup
cd /var/www/html
tar -czf ~/backup-$(date +%Y%m%d).tar.gz *
```

#### **Step 3: Clear Current Site**
```bash
# On your server
cd /var/www/html
rm -rf *
```

#### **Step 4: Upload New Files**
```bash
# From your local machine (in project directory)
scp -r * root@YOUR_SERVER_IP:/var/www/html/
```

#### **Step 5: Set Permissions**
```bash
# On your server
cd /var/www/html
chown -R www-data:www-data *
chmod -R 755 *
```

#### **Step 6: Restart Services**
```bash
# On your server
systemctl restart nginx
# or if using Apache:
# systemctl restart apache2
```

## 🔧 **Troubleshooting**

### **Common Issues:**

**🚫 Permission Denied (SSH)**
```bash
# Try with specific SSH key:
ssh -i ~/.ssh/your_key root@YOUR_SERVER_IP
```

**🚫 Web Server Not Starting**
```bash
# Check status:
systemctl status nginx
# View logs:
journalctl -u nginx -f
```

**🚫 Python Backend Issues**
```bash
# Install dependencies:
cd /var/www/html
pip3 install -r requirements.txt
```

## 📁 **Files Being Deployed**

### **Core Application:**
- `index.html` - Main emotion visualizer (with video preview fixes)
- `admin_panel.html` - Admin interface
- `video_manager.html` - Video management (with WebM support)
- `video_studio.html` - Video creation tools

### **Configuration:**
- `config/` - All conversation and emotion configs
- `conversations/` - Conversation data and analysis
- `videos/` - Video files and metadata

### **Backend:**
- `backend/` - Python server files
- `start_server.py` - Main server application
- `requirements.txt` - Python dependencies

### **Assets:**
- `assets/` - Fonts, images, logos
- `frontend/` - JavaScript modules

## 🎉 **Post-Deployment Verification**

1. **Visit your site:**
   - https://1on1.website/

2. **Test key features:**
   - ✅ Video previews load and play on hover
   - ✅ Admin panel is accessible
   - ✅ Video manager works
   - ✅ No cropping in video previews (fit behavior)

3. **Check browser console for errors:**
   - Open Developer Tools (F12)
   - Look for any JavaScript errors

## 🔄 **Rolling Back (If Needed)**

If something goes wrong:

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Restore backup
cd /var/www/html
rm -rf *
tar -xzf ~/backup-YYYYMMDD.tar.gz

# Restart services
systemctl restart nginx
```

## 📞 **Need Help?**

**Check these logs if issues occur:**
- Nginx: `/var/log/nginx/error.log`
- System: `journalctl -f`
- Application: Check browser console

**Performance monitoring:**
- Site speed: Use browser Developer Tools
- Server resources: `htop` or `top` 