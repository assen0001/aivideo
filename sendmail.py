#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
邮件发送模块
用于处理系统中的邮件发送功能，包括验证码发送等
"""

import smtplib
from email.mime.text import MIMEText
from email.header import Header
import os
from dotenv import load_dotenv

# 尝试加载环境变量（如果有.env文件）
try:
    load_dotenv()
except ImportError:
    print("未安装python-dotenv，跳过环境变量加载")

def send_email(to_email, subject, content):
    """
    发送邮件函数
    
    Args:
        to_email (str): 收件人邮箱地址
        subject (str): 邮件主题
        content (str): 邮件内容
    
    Returns:
        bool: 发送成功返回True，失败返回False
    """
    # 从环境变量或默认值获取邮件服务器配置
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.example.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    sender = os.getenv('SMTP_SENDER', 'your_email@example.com')
    password = os.getenv('SMTP_PASSWORD', 'your_password')
    
    # 创建邮件消息
    message = MIMEText(content, 'plain', 'utf-8')
    message['From'] = Header(sender)
    message['To'] = Header(to_email)
    message['Subject'] = Header(subject)
    
    try:
        # 根据端口选择不同的连接方式
        if smtp_port == 465:
            # 端口465使用SSL加密
            server = smtplib.SMTP_SSL(smtp_server, smtp_port)
        else:
            # 其他端口使用常规SMTP并启用TLS加密
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()  # 启用TLS加密
        
        server.login(sender, password)
        server.sendmail(sender, [to_email], message.as_string())
        server.quit()
        print(f"邮件发送成功: {to_email}")
        return True
    except Exception as e:
        print(f'发送邮件失败: {str(e)}')
        return False

def send_verification_code(email, code, expiration_minutes=30):
    """
    发送验证码邮件
    
    Args:
        email (str): 收件人邮箱
        code (str): 验证码
        expiration_minutes (int): 验证码有效期（分钟）
    
    Returns:
        bool: 发送成功返回True，失败返回False
    """
    subject = 'AIVideo 您的注册验证码'
    content = f'AIVideo - 一站式全流程AI视频创作平台（https://aivideo.site）\n您的验证码是：{code}，有效期{expiration_minutes}分钟。请勿将验证码泄露给他人。'
    
    return send_email(email, subject, content)

# 模板：发送重置密码到客户邮箱
def send_reset_password_email(email, password):
    """
    发送重置密码到客户邮箱
    
    Args:
        email (str): 收件人邮箱
        password (str): 重置后的密码
    
    Returns:
        bool: 发送成功返回True，失败返回False
    """
    subject = 'AIVideo 您的密码重置信息'
    content = f'AIVideo - 一站式全流程AI视频创作平台（https://aivideo.site）\n您的密码已重置为：{password}\n请登录后及时修改密码。'
    
    return send_email(email, subject, content)

# 模板：注册后发送默认密码到客户邮箱
def send_default_password_email(email, password):
    """
    发送注册后默认密码到客户邮箱
    
    Args:
        email (str): 收件人邮箱
        password (str): 默认密码
    
    Returns:
        bool: 发送成功返回True，失败返回False
    """
    subject = 'AIVideo 您的注册密码'
    content = f'AIVideo - 一站式全流程AI视频创作平台（https://aivideo.site）\n您的注册密码是：{password}\n请登录后及时修改密码。'
    
    return send_email(email, subject, content)