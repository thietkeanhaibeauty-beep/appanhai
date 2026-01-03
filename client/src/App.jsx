import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Gallery from './pages/Gallery';
import MyDesigns from './pages/MyDesigns';
import Editor from './pages/Editor';
import TemplateManager from './pages/TemplateManager';
import MigrationTool from './components/MigrationTool';

function App() {
  const [searchValue, setSearchValue] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  const [prevLoc, setPrevLoc] = useState(window.location.pathname);
  if (prevLoc !== window.location.pathname) {
    setIsMobileMenuOpen(false);
    setPrevLoc(window.location.pathname);
  }

  return (
    <Router>
      <Routes>
        {/* Template Manager - Full page without sidebar */}
        <Route path="/template" element={<TemplateManager />} />

        {/* Migration Tool - Full page */}
        <Route path="/migrate" element={<div className="app-layout" style={{ background: '#0a0a1a', minHeight: '100vh' }}><MigrationTool /></div>} />

        {/* Main Layout with Sidebar */}
        <Route path="/*" element={
          <div className="app-layout">
            {/* Mobile Overlay */}
            <div
              className={`sidebar-overlay ${isMobileMenuOpen ? 'visible' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Sidebar */}
            <Sidebar
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content */}
            <div className="main-content">
              <Header
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                credits={90}
                onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              />

              <main className="main-body">
                <Routes>
                  <Route
                    path="/"
                    element={
                      <Gallery
                        searchValue={searchValue}
                        activeCategory={activeCategory}
                      />
                    }
                  />
                  <Route path="/my-designs" element={<MyDesigns />} />
                  <Route path="/editor/:id" element={<Editor />} />
                </Routes>
              </main>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
