"""
Test suite for Agent Builder related APIs
Tests: /api/stats, /api/automation-goldmines, /api/occupations/{code}, 
       /api/search, /api/occupations/{code}/tasks, /api/occupations/{code}/skills,
       /api/occupations/{code}/knowledge, /api/occupations/{code}/tools
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndStats:
    """Health check and stats API tests"""
    
    def test_stats_endpoint(self):
        """Test /api/stats returns occupations, tasks, skills count"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert 'total_occupations' in data
        assert 'total_tasks' in data
        assert 'total_skills' in data
        
        # Verify data values are reasonable
        assert data['total_occupations'] > 0
        assert data['total_tasks'] > 0
        assert data['total_skills'] > 0
        
        print(f"Stats: {data['total_occupations']} occupations, {data['total_tasks']} tasks, {data['total_skills']} skills")


class TestAutomationGoldmines:
    """Test /api/automation-goldmines endpoint"""
    
    def test_goldmines_returns_data(self):
        """Test automation goldmines returns ranked opportunities"""
        response = requests.get(f"{BASE_URL}/api/automation-goldmines?limit=12")
        assert response.status_code == 200
        
        data = response.json()
        assert 'goldmines' in data
        assert 'total' in data
        assert isinstance(data['goldmines'], list)
        assert len(data['goldmines']) > 0
        
        # Check structure of first goldmine
        first = data['goldmines'][0]
        assert 'rank' in first
        assert 'business_score' in first
        assert 'task' in first
        assert 'occupation' in first
        
        # Verify task structure
        task = first['task']
        assert 'statement' in task
        assert 'automation_score' in task
        assert 'importance' in task
        
        # Verify occupation structure
        occupation = first['occupation']
        assert 'code' in occupation
        assert 'title' in occupation
        
        print(f"Goldmines: Found {data['total']} opportunities")


class TestSearchAPI:
    """Test /api/search endpoint"""
    
    def test_search_returns_results(self):
        """Test search for 'nurse' returns relevant occupations"""
        response = requests.get(f"{BASE_URL}/api/search?q=nurse")
        assert response.status_code == 200
        
        data = response.json()
        assert 'results' in data
        assert 'total' in data
        
        # Should find nurse-related occupations
        assert len(data['results']) > 0
        
        # Verify structure of results
        first = data['results'][0]
        assert 'onet_code' in first
        assert 'title_en' in first
        
        print(f"Search 'nurse': Found {data['total']} occupations")
    
    def test_search_accountant(self):
        """Test search for 'accountant' returns results"""
        response = requests.get(f"{BASE_URL}/api/search?q=accountant")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data['results']) > 0
        
        # Verify accountant-related occupation found
        titles = [r['title_en'].lower() for r in data['results']]
        assert any('account' in t for t in titles)
        
        print(f"Search 'accountant': Found {data['total']} occupations")


class TestOccupationDetail:
    """Test /api/occupations/{code} and related endpoints"""
    
    def test_occupation_by_code(self):
        """Test getting occupation details by O*NET code"""
        code = "43-3031.00"  # Bookkeeping Clerks
        response = requests.get(f"{BASE_URL}/api/occupations/{code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data['onet_code'] == code
        assert 'title_en' in data
        assert 'definition_en' in data
        assert 'task_count' in data
        
        # Verify data is populated
        assert data['task_count'] > 0
        
        print(f"Occupation {code}: {data['title_en']} with {data['task_count']} tasks")
    
    def test_occupation_tasks(self):
        """Test getting tasks for an occupation"""
        code = "43-3031.00"  # Bookkeeping Clerks
        response = requests.get(f"{BASE_URL}/api/occupations/{code}/tasks?sort=importance&order=desc")
        assert response.status_code == 200
        
        data = response.json()
        assert 'tasks' in data
        assert len(data['tasks']) > 0
        
        # Verify task structure
        task = data['tasks'][0]
        assert 'statement_en' in task
        assert 'importance' in task
        
        # Check if enriched tasks have automation scores
        enriched_tasks = [t for t in data['tasks'] if t.get('enriched')]
        if enriched_tasks:
            assert 'automatable_score' in enriched_tasks[0]
            print(f"Found {len(enriched_tasks)} enriched tasks with automation scores")
        
        print(f"Tasks for {code}: {len(data['tasks'])} tasks found")
    
    def test_occupation_skills(self):
        """Test getting skills for an occupation"""
        code = "43-3031.00"
        response = requests.get(f"{BASE_URL}/api/occupations/{code}/skills")
        assert response.status_code == 200
        
        data = response.json()
        assert 'skills' in data
        assert len(data['skills']) > 0
        
        # Verify skill structure
        skill = data['skills'][0]
        assert 'name' in skill
        assert 'importance' in skill
        
        print(f"Skills for {code}: {len(data['skills'])} skills found")
    
    def test_occupation_knowledge(self):
        """Test getting knowledge areas for an occupation"""
        code = "43-3031.00"
        response = requests.get(f"{BASE_URL}/api/occupations/{code}/knowledge")
        assert response.status_code == 200
        
        data = response.json()
        assert 'knowledge' in data
        assert len(data['knowledge']) > 0
        
        # Verify knowledge structure
        knowledge = data['knowledge'][0]
        assert 'name' in knowledge
        
        print(f"Knowledge for {code}: {len(data['knowledge'])} areas found")
    
    def test_occupation_tools(self):
        """Test getting tools and technology for an occupation"""
        code = "43-3031.00"
        response = requests.get(f"{BASE_URL}/api/occupations/{code}/tools")
        assert response.status_code == 200
        
        data = response.json()
        assert 'tools' in data
        assert 'technology' in data
        
        total = len(data['tools']) + len(data['technology'])
        assert total > 0
        
        print(f"Tools/Tech for {code}: {len(data['tools'])} tools, {len(data['technology'])} technology")
    
    def test_occupation_not_found(self):
        """Test 404 for non-existent occupation"""
        response = requests.get(f"{BASE_URL}/api/occupations/99-9999.99")
        assert response.status_code == 404


class TestAutomationOpportunities:
    """Test /api/automation-opportunities endpoint"""
    
    def test_automation_opportunities(self):
        """Test getting high-automation tasks with templates"""
        response = requests.get(f"{BASE_URL}/api/automation-opportunities?min_score=0.6&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert 'opportunities' in data
        assert 'total' in data
        
        if data['total'] > 0:
            opp = data['opportunities'][0]
            assert 'task' in opp
            assert 'occupation' in opp
            assert 'automation_guide' in opp
            
            # Verify automation guide has prompt template
            guide = opp['automation_guide']
            assert 'prompt_template' in guide
            assert 'workflow_steps' in guide
            
            print(f"Automation opportunities: {data['total']} found")


class TestFeaturedOccupations:
    """Test /api/featured endpoint"""
    
    def test_featured_returns_data(self):
        """Test featured occupations are returned"""
        response = requests.get(f"{BASE_URL}/api/featured")
        assert response.status_code == 200
        
        data = response.json()
        assert 'featured' in data
        assert len(data['featured']) > 0
        
        # Verify structure
        first = data['featured'][0]
        assert 'onet_code' in first
        assert 'title_en' in first
        
        print(f"Featured: {len(data['featured'])} occupations")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
