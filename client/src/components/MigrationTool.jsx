import React, { useState, useEffect } from 'react';
import api, { healthCheck, migrationApi, getImageUrl } from '../services/api';
import './MigrationTool.css';

const MigrationTool = () => {
    const [serverStatus, setServerStatus] = useState('checking');
    const [localStorageStats, setLocalStorageStats] = useState(null);
    const [migrating, setMigrating] = useState(false);
    const [migrationResult, setMigrationResult] = useState(null);
    const [error, setError] = useState(null);

    // Check server status and localStorage stats on mount
    useEffect(() => {
        checkServerStatus();
        checkLocalStorageStats();
    }, []);

    const checkServerStatus = async () => {
        try {
            await healthCheck();
            setServerStatus('online');
        } catch (err) {
            setServerStatus('offline');
        }
    };

    const checkLocalStorageStats = () => {
        try {
            const categories = JSON.parse(localStorage.getItem('custom_categories') || '[]');
            const templates = JSON.parse(localStorage.getItem('custom_templates') || '[]');
            const designs = JSON.parse(localStorage.getItem('my_designs') || '[]');

            const totalSize = (
                (localStorage.getItem('custom_categories') || '').length +
                (localStorage.getItem('custom_templates') || '').length +
                (localStorage.getItem('my_designs') || '').length
            );

            setLocalStorageStats({
                categories: categories.length,
                templates: templates.length,
                designs: designs.length,
                totalSize: (totalSize / 1024 / 1024).toFixed(2), // MB
            });
        } catch (err) {
            console.error('Error checking localStorage:', err);
        }
    };

    const handleMigrate = async () => {
        if (serverStatus !== 'online') {
            setError('Server is not running. Please start the backend server first.');
            return;
        }

        setMigrating(true);
        setError(null);
        setMigrationResult(null);

        try {
            const result = await migrationApi.migrateFromLocalStorage();
            setMigrationResult(result);

            // Ask user if they want to clear localStorage
            if (result.success && (result.stats.templates > 0 || result.stats.designs > 0)) {
                const shouldClear = window.confirm(
                    `Migration completed successfully!\n\n` +
                    `Migrated:\n` +
                    `- ${result.stats.categories} categories\n` +
                    `- ${result.stats.templates} templates\n` +
                    `- ${result.stats.designs} designs\n\n` +
                    `Do you want to clear localStorage to free up browser storage?`
                );

                if (shouldClear) {
                    migrationApi.clearLocalStorage();
                    checkLocalStorageStats();
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setMigrating(false);
        }
    };

    const handleClearLocalStorage = () => {
        if (window.confirm('Are you sure you want to clear all localStorage data? This cannot be undone.')) {
            migrationApi.clearLocalStorage();
            checkLocalStorageStats();
        }
    };

    return (
        <div className="migration-tool">
            <h2>🔄 Data Migration Tool</h2>
            <p className="description">
                Migrate your data from browser localStorage to the server database for unlimited storage.
            </p>

            {/* Server Status */}
            <div className="status-section">
                <h3>Server Status</h3>
                <div className={`status-badge ${serverStatus}`}>
                    {serverStatus === 'checking' && '⏳ Checking...'}
                    {serverStatus === 'online' && '✅ Online'}
                    {serverStatus === 'offline' && '❌ Offline'}
                </div>
                {serverStatus === 'offline' && (
                    <div className="server-instructions">
                        <p>To start the server, run these commands:</p>
                        <pre>
                            cd server{'\n'}
                            npm install{'\n'}
                            npm run dev
                        </pre>
                        <button onClick={checkServerStatus} className="retry-btn">
                            🔄 Retry Connection
                        </button>
                    </div>
                )}
            </div>

            {/* LocalStorage Stats */}
            <div className="stats-section">
                <h3>Current localStorage Data</h3>
                {localStorageStats ? (
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-value">{localStorageStats.categories}</span>
                            <span className="stat-label">Categories</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{localStorageStats.templates}</span>
                            <span className="stat-label">Templates</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{localStorageStats.designs}</span>
                            <span className="stat-label">Designs</span>
                        </div>
                        <div className="stat-item total">
                            <span className="stat-value">{localStorageStats.totalSize} MB</span>
                            <span className="stat-label">Total Size</span>
                        </div>
                    </div>
                ) : (
                    <p>Loading...</p>
                )}
            </div>

            {/* Migration Actions */}
            <div className="actions-section">
                <button
                    onClick={handleMigrate}
                    disabled={migrating || serverStatus !== 'online'}
                    className="migrate-btn"
                >
                    {migrating ? '⏳ Migrating...' : '🚀 Start Migration'}
                </button>

                <button
                    onClick={handleClearLocalStorage}
                    className="clear-btn"
                    disabled={!localStorageStats || (localStorageStats.templates === 0 && localStorageStats.designs === 0)}
                >
                    🗑️ Clear localStorage
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="error-message">
                    ❌ {error}
                </div>
            )}

            {/* Migration Result */}
            {migrationResult && (
                <div className="result-message success">
                    ✅ Migration completed successfully!
                    <ul>
                        <li>Categories: {migrationResult.stats?.categories || 0}</li>
                        <li>Templates: {migrationResult.stats?.templates || 0}</li>
                        <li>Designs: {migrationResult.stats?.designs || 0}</li>
                    </ul>
                </div>
            )}

            {/* Benefits Info */}
            <div className="benefits-section">
                <h3>✨ Benefits of Server Storage</h3>
                <ul>
                    <li>🚀 <strong>Unlimited storage</strong> - No more 5MB browser limit</li>
                    <li>💾 <strong>Permanent data</strong> - Data persists even if browser cache is cleared</li>
                    <li>🖼️ <strong>Efficient image storage</strong> - Images saved as files, not base64</li>
                    <li>🔄 <strong>Faster loading</strong> - Only load data you need</li>
                    <li>📱 <strong>Multi-device access</strong> - Access from any device on your network</li>
                </ul>
            </div>
        </div>
    );
};

export default MigrationTool;
