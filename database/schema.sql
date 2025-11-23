-- Test Case Management System Database Schema

-- Drop tables if exists (for clean setup)
DROP TABLE IF EXISTS tt_import_result_errors CASCADE;
DROP TABLE IF EXISTS tt_import_results CASCADE;
DROP TABLE IF EXISTS tt_test_evidences CASCADE;
DROP TABLE IF EXISTS tt_test_results_history CASCADE;
DROP TABLE IF EXISTS tt_test_results CASCADE;
DROP TABLE IF EXISTS tt_test_contents CASCADE;
DROP TABLE IF EXISTS tt_test_case_files CASCADE;
DROP TABLE IF EXISTS tt_test_cases CASCADE;
DROP TABLE IF EXISTS tt_test_group_tags CASCADE;
DROP TABLE IF EXISTS tt_test_groups CASCADE;
DROP TABLE IF EXISTS mt_user_tags CASCADE;
DROP TABLE IF EXISTS mt_tags CASCADE;
DROP TABLE IF EXISTS mt_users CASCADE;

-- ============================================
-- Master Tables
-- ============================================

-- Users Master Table
CREATE TABLE mt_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    user_role INTEGER NOT NULL DEFAULT 2, -- 0: Admin, 1: Test Manager, 2: General
    department VARCHAR(255),
    company VARCHAR(255),
    password VARCHAR(255) NOT NULL, -- bcrypt hash
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Tags Master Table
CREATE TABLE mt_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- User Tags Relation Table
CREATE TABLE mt_user_tags (
    user_id INTEGER NOT NULL REFERENCES mt_users(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES mt_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, tag_id)
);

-- ============================================
-- Transaction Tables - Test Groups
-- ============================================

-- Test Groups Table
CREATE TABLE tt_test_groups (
    id SERIAL PRIMARY KEY,
    oem VARCHAR(255),
    model VARCHAR(255),
    event VARCHAR(255),
    variation VARCHAR(255),
    destination VARCHAR(255),
    specs TEXT,
    test_startdate DATE,
    test_enddate DATE,
    ng_plan_count INTEGER DEFAULT 0,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Test Group Tags Relation Table (Dynamic Permissions)
CREATE TABLE tt_test_group_tags (
    test_group_id INTEGER NOT NULL REFERENCES tt_test_groups(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES mt_tags(id) ON DELETE CASCADE,
    test_role INTEGER NOT NULL, -- 1: Designer, 2: Executor, 3: Viewer
    PRIMARY KEY (test_group_id, tag_id, test_role)
);

-- ============================================
-- Transaction Tables - Test Cases
-- ============================================

-- Test Cases Table
CREATE TABLE tt_test_cases (
    test_group_id INTEGER NOT NULL REFERENCES tt_test_groups(id) ON DELETE CASCADE,
    tid VARCHAR(255) NOT NULL,
    first_layer TEXT,
    second_layer TEXT,
    third_layer TEXT,
    fourth_layer TEXT,
    purpose TEXT,
    request_id TEXT,
    check_items TEXT,
    test_procedure TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (test_group_id, tid)
);

-- Test Case Files Table
CREATE TABLE tt_test_case_files (
    test_group_id INTEGER NOT NULL,
    tid VARCHAR(255) NOT NULL,
    file_type INTEGER NOT NULL, -- 0: Control Spec, 1: Data Flow
    file_no INTEGER NOT NULL,
    file_name TEXT,
    file_path TEXT, -- S3 path
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (test_group_id, tid, file_type, file_no),
    FOREIGN KEY (test_group_id, tid) REFERENCES tt_test_cases(test_group_id, tid) ON DELETE CASCADE
);

-- Test Contents Table
CREATE TABLE tt_test_contents (
    test_group_id INTEGER NOT NULL,
    tid VARCHAR(255) NOT NULL,
    test_case_no INTEGER NOT NULL,
    test_case TEXT,
    expected_value TEXT,
    is_target BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (test_group_id, tid, test_case_no),
    FOREIGN KEY (test_group_id, tid) REFERENCES tt_test_cases(test_group_id, tid) ON DELETE CASCADE
);

-- ============================================
-- Transaction Tables - Test Results
-- ============================================

-- Test Results Table
CREATE TABLE tt_test_results (
    test_group_id INTEGER NOT NULL,
    tid VARCHAR(255) NOT NULL,
    test_case_no INTEGER NOT NULL,
    result TEXT,
    judgment VARCHAR(16), -- 'OK', 'NG', '再実施対象外'
    software_version VARCHAR(255),
    hardware_version VARCHAR(255),
    comparator_version VARCHAR(255),
    execution_date DATE,
    executor VARCHAR(255),
    note TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (test_group_id, tid, test_case_no),
    FOREIGN KEY (test_group_id, tid, test_case_no)
        REFERENCES tt_test_contents(test_group_id, tid, test_case_no) ON DELETE CASCADE
);

-- Test Results History Table
CREATE TABLE tt_test_results_history (
    test_group_id INTEGER NOT NULL,
    tid VARCHAR(255) NOT NULL,
    test_case_no INTEGER NOT NULL,
    history_count INTEGER NOT NULL,
    result TEXT,
    judgment VARCHAR(16),
    software_version VARCHAR(255),
    hardware_version VARCHAR(255),
    comparator_version VARCHAR(255),
    execution_date DATE,
    executor VARCHAR(255),
    note TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (test_group_id, tid, test_case_no, history_count),
    FOREIGN KEY (test_group_id, tid, test_case_no)
        REFERENCES tt_test_contents(test_group_id, tid, test_case_no) ON DELETE CASCADE
);

-- Test Evidences Table
CREATE TABLE tt_test_evidences (
    test_group_id INTEGER NOT NULL,
    tid VARCHAR(255) NOT NULL,
    test_case_no INTEGER NOT NULL,
    history_count INTEGER NOT NULL,
    evidence_no INTEGER NOT NULL,
    evidence_name TEXT,
    evidence_path TEXT, -- S3 path
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (test_group_id, tid, test_case_no, history_count, evidence_no),
    FOREIGN KEY (test_group_id, tid, test_case_no, history_count)
        REFERENCES tt_test_results_history(test_group_id, tid, test_case_no, history_count) ON DELETE CASCADE
);

-- ============================================
-- Transaction Tables - Import
-- ============================================

-- Import Results Table
CREATE TABLE tt_import_results (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255),
    import_date DATE NOT NULL DEFAULT CURRENT_DATE,
    import_status INTEGER NOT NULL DEFAULT 1, -- 0: Error, 1: In Progress, 3: Completed
    executor_name VARCHAR(255),
    import_type INTEGER NOT NULL, -- 0: Test Case, 1: User
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Import Result Errors Table
CREATE TABLE tt_import_result_errors (
    id SERIAL PRIMARY KEY,
    import_result_id INTEGER NOT NULL REFERENCES tt_import_results(id) ON DELETE CASCADE,
    error_details TEXT,
    error_row INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX idx_users_email ON mt_users(email) WHERE is_deleted = FALSE;
CREATE INDEX idx_users_role ON mt_users(user_role) WHERE is_deleted = FALSE;
CREATE INDEX idx_test_groups_created_by ON tt_test_groups(created_by) WHERE is_deleted = FALSE;
CREATE INDEX idx_test_group_tags_tag ON tt_test_group_tags(tag_id);
CREATE INDEX idx_test_group_tags_group ON tt_test_group_tags(test_group_id);
CREATE INDEX idx_test_cases_group ON tt_test_cases(test_group_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_test_contents_target ON tt_test_contents(is_target) WHERE is_deleted = FALSE;
CREATE INDEX idx_test_results_judgment ON tt_test_results(judgment) WHERE is_deleted = FALSE;
CREATE INDEX idx_import_results_status ON tt_import_results(import_status) WHERE is_deleted = FALSE;

-- ============================================
-- Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_mt_users_updated_at BEFORE UPDATE ON mt_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mt_tags_updated_at BEFORE UPDATE ON mt_tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tt_test_groups_updated_at BEFORE UPDATE ON tt_test_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tt_test_cases_updated_at BEFORE UPDATE ON tt_test_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tt_test_case_files_updated_at BEFORE UPDATE ON tt_test_case_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tt_test_contents_updated_at BEFORE UPDATE ON tt_test_contents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tt_test_results_updated_at BEFORE UPDATE ON tt_test_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tt_test_results_history_updated_at BEFORE UPDATE ON tt_test_results_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tt_test_evidences_updated_at BEFORE UPDATE ON tt_test_evidences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tt_import_results_updated_at BEFORE UPDATE ON tt_import_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tt_import_result_errors_updated_at BEFORE UPDATE ON tt_import_result_errors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================

-- Insert default admin user (password: admin123)
-- bcrypt hash for 'admin123' - verified working
INSERT INTO mt_users (email, user_role, department, company, password)
VALUES ('admin@example.com', 0, 'IT', 'Test Company', '$2b$10$DWGzpr.74IrnPG3AjGyL9uiLTbgAQXrYXLcLlsArtKNZtnaQs2AWa');
