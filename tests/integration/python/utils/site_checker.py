"""
Utility for verifying generated site content and structure
"""
import os
import requests
from pathlib import Path
from bs4 import BeautifulSoup
from typing import Dict, List, Optional, Any
import json
import re


class SiteChecker:
    """Helper class for verifying generated site content"""
    
    def __init__(self, site_directory: str = "_site"):
        self.site_directory = Path(site_directory)
        self.encoding = "utf-8"
    
    def verify_site_structure(self) -> Dict[str, Any]:
        """
        Verify the basic structure of generated site
        
        Returns:
            Dictionary with verification results
        """
        results = {
            "site_directory_exists": False,
            "has_index_file": False,
            "html_files_count": 0,
            "css_files_count": 0,
            "js_files_count": 0,
            "image_files_count": 0,
            "total_files": 0,
            "directory_structure": [],
            "errors": []
        }
        
        try:
            if not self.site_directory.exists():
                results["errors"].append(f"Site directory {self.site_directory} does not exist")
                return results
            
            results["site_directory_exists"] = True
            
            # Check for index file
            index_files = ["index.html", "index.htm"]
            for index_file in index_files:
                if (self.site_directory / index_file).exists():
                    results["has_index_file"] = True
                    break
            
            # Count different file types
            all_files = list(self.site_directory.rglob("*"))
            results["total_files"] = len([f for f in all_files if f.is_file()])
            
            for file_path in all_files:
                if file_path.is_file():
                    suffix = file_path.suffix.lower()
                    if suffix in [".html", ".htm"]:
                        results["html_files_count"] += 1
                    elif suffix == ".css":
                        results["css_files_count"] += 1
                    elif suffix in [".js", ".jsx"]:
                        results["js_files_count"] += 1
                    elif suffix in [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico"]:
                        results["image_files_count"] += 1
                elif file_path.is_dir():
                    rel_path = file_path.relative_to(self.site_directory)
                    results["directory_structure"].append(str(rel_path))
            
        except Exception as e:
            results["errors"].append(f"Error analyzing site structure: {str(e)}")
        
        return results
    
    def verify_html_content(self, file_path: str = "index.html") -> Dict[str, Any]:
        """
        Verify HTML content of a specific file
        
        Args:
            file_path: Relative path to HTML file within site directory
            
        Returns:
            Dictionary with HTML verification results
        """
        results = {
            "file_exists": False,
            "is_valid_html": False,
            "has_title": False,
            "title_text": "",
            "has_meta_charset": False,
            "has_viewport_meta": False,
            "japanese_content_detected": False,
            "word_count": 0,
            "link_count": 0,
            "image_count": 0,
            "errors": []
        }
        
        full_path = self.site_directory / file_path
        
        try:
            if not full_path.exists():
                results["errors"].append(f"File {file_path} does not exist")
                return results
            
            results["file_exists"] = True
            
            # Read and parse HTML
            with open(full_path, 'r', encoding=self.encoding) as f:
                content = f.read()
            
            soup = BeautifulSoup(content, 'html.parser')
            results["is_valid_html"] = soup.html is not None
            
            # Check title
            title_tag = soup.find('title')
            if title_tag:
                results["has_title"] = True
                results["title_text"] = title_tag.get_text().strip()
            
            # Check meta tags
            charset_meta = soup.find('meta', attrs={'charset': True})
            results["has_meta_charset"] = charset_meta is not None
            
            viewport_meta = soup.find('meta', attrs={'name': 'viewport'})
            results["has_viewport_meta"] = viewport_meta is not None
            
            # Check for Japanese content
            japanese_patterns = [
                r'[\u3040-\u309F]',  # Hiragana
                r'[\u30A0-\u30FF]',  # Katakana
                r'[\u4E00-\u9FAF]',  # Kanji
            ]
            
            text_content = soup.get_text()
            for pattern in japanese_patterns:
                if re.search(pattern, text_content):
                    results["japanese_content_detected"] = True
                    break
            
            # Count elements
            results["word_count"] = len(text_content.split())
            results["link_count"] = len(soup.find_all('a'))
            results["image_count"] = len(soup.find_all('img'))
            
        except Exception as e:
            results["errors"].append(f"Error analyzing HTML content: {str(e)}")
        
        return results
    
    def verify_css_assets(self) -> Dict[str, Any]:
        """
        Verify CSS assets are present and valid
        
        Returns:
            Dictionary with CSS verification results
        """
        results = {
            "css_files_found": [],
            "total_css_size": 0,
            "has_responsive_rules": False,
            "errors": []
        }
        
        try:
            css_files = list(self.site_directory.rglob("*.css"))
            
            for css_file in css_files:
                results["css_files_found"].append(str(css_file.relative_to(self.site_directory)))
                results["total_css_size"] += css_file.stat().st_size
                
                # Check for responsive design rules
                with open(css_file, 'r', encoding=self.encoding) as f:
                    css_content = f.read()
                    if "@media" in css_content:
                        results["has_responsive_rules"] = True
            
        except Exception as e:
            results["errors"].append(f"Error analyzing CSS assets: {str(e)}")
        
        return results
    
    def verify_beaver_specific_content(self) -> Dict[str, Any]:
        """
        Verify Beaver-specific content and functionality
        
        Returns:
            Dictionary with Beaver-specific verification results
        """
        results = {
            "has_issues_content": False,
            "has_statistics": False,
            "has_navigation": False,
            "has_search_functionality": False,
            "beaver_branding_present": False,
            "japanese_ui_elements": False,
            "errors": []
        }
        
        try:
            # Check index.html for Beaver-specific content
            index_path = self.site_directory / "index.html"
            if index_path.exists():
                with open(index_path, 'r', encoding=self.encoding) as f:
                    content = f.read()
                
                soup = BeautifulSoup(content, 'html.parser')
                text_content = soup.get_text().lower()
                
                # Check for Issues content
                if "issue" in text_content or "イシュー" in content:
                    results["has_issues_content"] = True
                
                # Check for statistics
                if "statistics" in text_content or "統計" in content or "stats" in text_content:
                    results["has_statistics"] = True
                
                # Check for navigation
                nav_elements = soup.find_all(['nav', 'ul', 'ol'])
                if len(nav_elements) > 0:
                    results["has_navigation"] = True
                
                # Check for search
                search_inputs = soup.find_all('input', attrs={'type': 'search'})
                search_forms = soup.find_all('form', class_=re.compile(r'search', re.I))
                if search_inputs or search_forms or "search" in text_content:
                    results["has_search_functionality"] = True
                
                # Check for Beaver branding
                if "beaver" in text_content or "ビーバー" in content or "🦫" in content:
                    results["beaver_branding_present"] = True
                
                # Check for Japanese UI elements
                japanese_ui_keywords = ["ホーム", "検索", "統計", "課題", "ナレッジベース"]
                for keyword in japanese_ui_keywords:
                    if keyword in content:
                        results["japanese_ui_elements"] = True
                        break
            
        except Exception as e:
            results["errors"].append(f"Error analyzing Beaver-specific content: {str(e)}")
        
        return results
    
    def verify_github_pages_compatibility(self) -> Dict[str, Any]:
        """
        Verify GitHub Pages compatibility
        
        Returns:
            Dictionary with GitHub Pages compatibility results
        """
        results = {
            "has_index_html": False,
            "no_jekyll_conflicts": True,
            "relative_links_only": True,
            "no_server_side_code": True,
            "errors": []
        }
        
        try:
            # Check for index.html
            index_path = self.site_directory / "index.html"
            results["has_index_html"] = index_path.exists()
            
            # Check for Jekyll conflicts
            jekyll_files = [".jekyll-cache", "_site", "Gemfile", "_config.yml"]
            for jekyll_file in jekyll_files:
                if (self.site_directory / jekyll_file).exists():
                    results["no_jekyll_conflicts"] = False
                    break
            
            # Check all HTML files for compatibility issues
            html_files = list(self.site_directory.rglob("*.html"))
            for html_file in html_files:
                with open(html_file, 'r', encoding=self.encoding) as f:
                    content = f.read()
                
                # Check for absolute links (potential issue)
                if "http://localhost" in content or "https://localhost" in content:
                    results["relative_links_only"] = False
                
                # Check for server-side code
                server_side_patterns = ["<?php", "<%", "{{ ", "{%"]
                for pattern in server_side_patterns:
                    if pattern in content:
                        results["no_server_side_code"] = False
                        break
            
        except Exception as e:
            results["errors"].append(f"Error analyzing GitHub Pages compatibility: {str(e)}")
        
        return results
    
    def generate_verification_report(self) -> Dict[str, Any]:
        """
        Generate comprehensive verification report
        
        Returns:
            Complete verification report
        """
        return {
            "site_structure": self.verify_site_structure(),
            "html_content": self.verify_html_content(),
            "css_assets": self.verify_css_assets(),
            "beaver_content": self.verify_beaver_specific_content(),
            "github_pages_compatibility": self.verify_github_pages_compatibility()
        }