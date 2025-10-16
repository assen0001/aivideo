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
        # 连接邮件服务器并发送邮件
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

def send_verification_code(email, code, expiration_minutes=5):
    """
    发送验证码邮件
    
    Args:
        email (str): 收件人邮箱
        code (str): 验证码
        expiration_minutes (int): 验证码有效期（分钟）
    
    Returns:
        bool: 发送成功返回True，失败返回False
    """
    subject = '您的注册验证码'
    content = f'您的验证码是：{code}，有效期{expiration_minutes}分钟。请勿将验证码泄露给他人。'
    
    return send_email(email, subject, content)

# 测试函数，用于验证邮件发送功能
def test_email_send():
    """
    测试邮件发送功能
    注意：在生产环境中请注释或删除此函数的调用
    """
    test_email = input("请输入测试邮箱地址: ")
    test_code = "123456"  # 测试验证码
    result = send_verification_code(test_email, test_code)
    print(f"测试结果: {'成功' if result else '失败'}")

if __name__ == '__main__':
    # 当直接运行此文件时执行测试
    test_email_send()