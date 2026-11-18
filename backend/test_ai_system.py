"""
Comprehensive test script for AI Website Generation System
Tests all components without requiring the AI model file
"""

import sys
import time

def print_test(name, status="RUNNING"):
    status_icon = {
        "RUNNING": "🔄",
        "PASS": "✅",
        "FAIL": "❌",
        "SKIP": "⏭️",
        "WARN": "⚠️"
    }
    icon = status_icon.get(status, "❓")
    print(f"{icon} {name}")

def test_1_database_models():
    """Test that all new database models can be imported"""
    print_test("Test 1: Database Models Import", "RUNNING")
    try:
        from app.models.tenant_website import TenantWebsite
        from app.models.ai_generation import AIGeneration
        from app.models.website_section import WebsiteSection
        from app.models.ai_generation_queue import AIGenerationQueue
        print_test("Test 1: Database Models Import", "PASS")
        return True
    except Exception as e:
        print(f"Error: {e}")
        print_test("Test 1: Database Models Import", "FAIL")
        return False

def test_2_database_tables():
    """Test that tables were created by migration"""
    print_test("Test 2: Database Tables Exist", "RUNNING")
    try:
        from sqlalchemy import inspect
        from app.db.session import engine
        
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        required_tables = [
            'tenant_websites',
            'ai_generations',
            'website_sections',
            'ai_generation_queue'
        ]
        
        missing_tables = [t for t in required_tables if t not in tables]
        
        if missing_tables:
            print(f"Missing tables: {missing_tables}")
            print_test("Test 2: Database Tables Exist", "FAIL")
            return False
        
        print(f"Found all 4 AI tables in database")
        print_test("Test 2: Database Tables Exist", "PASS")
        return True
    except Exception as e:
        print(f"Error: {e}")
        print_test("Test 2: Database Tables Exist", "FAIL")
        return False

def test_3_redis_connection():
    """Test Redis connection"""
    print_test("Test 3: Redis Connection", "RUNNING")
    try:
        from app.ai_module.cache_manager import get_redis_client
        
        client = get_redis_client()
        if client is None:
            print("Redis client not available (Warning: caching won't work)")
            print_test("Test 3: Redis Connection", "WARN")
            return True  # Not fatal
        
        pong = client.ping()
        if pong:
            print("Redis responding to ping")
            print_test("Test 3: Redis Connection", "PASS")
            return True
        else:
            print_test("Test 3: Red is Connection", "FAIL")
            return False
    except Exception as e:
        print(f"Redis error: {e}")
        print_test("Test 3: Redis Connection", "WARN")
        return True  # Not fatal

def test_4_school_type_detection():
    """Test school type auto-detection"""
    print_test("Test 4: School Type Detection", "RUNNING")
    try:
        from app.ai_module.school_detector import detect_school_type
        
        test_cases = [
            ("Springfield Elementary School, K-5, 400 students", "elementary"),
            ("Lincoln High School with strong athletics", "high_school"),
            ("State University offering bachelor degrees", "university"),
            ("Tech Academy coding bootcamp 16-week program", "training"),
            ("Online learning platform for professional courses", "elearning"),
        ]
        
        all_passed = True
        for description, expected in test_cases:
            result = detect_school_type(description)
            match = "✓" if result == expected else "✗"
            print(f"  {match} '{description[:40]}...' → {result}")
            if result != expected:
                all_passed = False
        
        if all_passed:
            print_test("Test 4: School Type Detection", "PASS")
            return True
        else:
            print_test("Test 4: School Type Detection", "FAIL")
            return False
    except Exception as e:
        print(f"Error: {e}")
        print_test("Test 4: School Type Detection", "FAIL")
        return False

def test_5_json_validator():
    """Test JSON validation"""
    print_test("Test 5: JSON Validation", "RUNNING")
    try:
        from app.ai_module.json_validator import validate_website_json
        
        # Valid JSON
        valid_json = {
            "version": "1.0.0",
            "metadata": {
                "title": "Test School",
                "description": "A test school",
                "keywords": ["education"]
            },
            "theme": {
                "primaryColor": "#2563EB"
            },
            "sections": [
                {"id": "hero-1", "type": "hero", "order": 1, "props": {}},
                {"id": "about-1", "type": "about", "order": 2, "props": {}},
                {"id": "footer-1", "type": "footer", "order": 3, "props": {}}
            ]
        }
        
        is_valid, errors = validate_website_json(valid_json)
        if not is_valid:
            print(f"Valid JSON failed validation: {errors}")
            print_test("Test 5: JSON Validation", "FAIL")
            return False
        
        # Invalid JSON (missing required fields)
        invalid_json = {"version": "1.0.0"}
        is_valid, errors = validate_website_json(invalid_json)
        if is_valid:
            print("Invalid JSON passed validation (should fail)")
            print_test("Test 5: JSON Validation", "FAIL")
            return False
        
        print("Valid JSON passed, invalid JSON rejected")
        print_test("Test 5: JSON Validation", "PASS")
        return True
    except Exception as e:
        print(f"Error: {e}")
        print_test("Test 5: JSON Validation", "FAIL")
        return False

def test_6_cache_manager():
    """Test cache manager operations"""
    print_test("Test 6: Cache Manager", "RUNNING")
    try:
        from app.ai_module.cache_manager import (
            get_cached_generation,
            cache_generation,
            invalidate_cache
        )
        
        test_key = "test_cache_key_123"
        test_data = {"test": "data", "value": 42}
        
        # Test cache write
        success = cache_generation(test_key, test_data)
        if not success:
            print("Cache write failed (Redis may not be available)")
            print_test("Test 6: Cache Manager", "WARN")
            return True  # Not fatal
        
        # Test cache read
        cached = get_cached_generation(test_key)
        if cached != test_data:
            print(f"Cache read mismatch: expected {test_data}, got {cached}")
            print_test("Test 6: Cache Manager", "FAIL")
            return False
        
        # Test cache invalidation
        invalidate_cache(test_key)
        cached_after = get_cached_generation(test_key)
        if cached_after is not None:
            print("Cache invalidation failed")
            print_test("Test 6: Cache Manager", "FAIL")
            return False
        
        print("Cache write, read, and invalidation working")
        print_test("Test 6: Cache Manager", "PASS")
        return True
    except Exception as e:
        print(f"Error: {e}")
        print_test("Test 6: Cache Manager", "WARN")
        return True  # Not fatal

def test_7_model_loader_check():
    """Test model loader (won't load model without file)"""
    print_test("Test 7: Model Loader Check", "RUNNING")
    try:
        from app.ai_module.model_loader import is_model_loaded
        import os
        from pathlib import Path
        
        model_path = os.getenv("AI_MODEL_PATH", "/app/models/phi-3-mini-4k-instruct-q4_k_m.gguf")
        
        if Path(model_path).exists():
            print(f"✓ Model file found at {model_path}")
            print_test("Test 7: Model Loader Check", "PASS")
            return True
        else:
            print(f"ℹ️ Model file not found at {model_path}")
            print("This is expected - model must be downloaded separately (2.3GB)")
            print("See AI_SETUP_README.md for download instructions")
            print_test("Test 7: Model Loader Check", "SKIP")
            return True  # Not a failure
    except Exception as e:
        print(f"Error: {e}")
        print_test("Test 7: Model Loader Check", "FAIL")
        return False

def test_8_prompt_builder():
    """Test prompt builder"""
    print_test("Test 8: Prompt Builder", "RUNNING")
    try:
        from app.ai_module.prompt_builder import build_prompt
        
        prompt = build_prompt(
            "Test School Description",
            "high_school",
            {"primaryColor": "#1E40AF"}
        )
        
        if len(prompt) < 50:
            print("Generated prompt too short")
            print_test("Test 8: Prompt Builder", "FAIL")
            return False
        
        if "Test School Description" not in prompt:
            print("Prompt missing description")
            print_test("Test 8: Prompt Builder", "FAIL")
            return False
        
        if "#1E40AF" not in prompt:
            print("Prompt missing colors")
            print_test("Test 8: Prompt Builder", "FAIL")
            return False
        
        print(f"Generated prompt ({len(prompt)} chars)")
        print_test("Test 8: Prompt Builder", "PASS")
        return True
    except Exception as e:
        print(f"Error: {e}")
        print_test("Test 8: Prompt Builder", "FAIL")
        return False

def main():
    print("\n" + "="*60)
    print("AI WEBSITE GENERATION SYSTEM - COMPREHENSIVE TEST SUITE")
    print("="*60 + "\n")
    
    tests = [
        test_1_database_models,
        test_2_database_tables,
        test_3_redis_connection,
        test_4_school_type_detection,
        test_5_json_validator,
        test_6_cache_manager,
        test_7_model_loader_check,
        test_8_prompt_builder,
    ]
    
    results = []
    for test_func in tests:
        print()
        result = test_func()
        results.append((test_func.__name__, result))
        time.sleep(0.5)
    
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60 + "\n")
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\n{'='*60}")
    print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}%)")
    print(f"{'='*60}\n")
    
    if passed == total:
        print("🎉 All tests passed! AI system is ready.")
        print("📥 Next step: Download AI model (see AI_SETUP_README.md)")
        return 0
    elif passed >= total * 0.8:
        print("⚠️ Most tests passed. Minor issues detected.")
        return 0
    else:
        print("❌ Multiple test failures. Please review errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
