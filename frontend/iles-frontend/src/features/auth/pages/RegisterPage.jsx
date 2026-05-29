import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, departmentsAPI } from '../../../services/endpoints';
import { useAuth } from '../../../hooks/AuthContext';
import './RegisterPage.css';

function RegisterPage() {
  const CODE_EXPIRY_SECONDS = 10 * 60;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    institutionName: '',
    institutionEmail: '',
    institutionVerificationCode: '',
    organizationName: '',
    organizationId: '',
    courseName: '',
    departmentName: '',
    departmentId: '',
  });
  const [organizationResults, setOrganizationResults] = useState([]);
  const [courseResults, setCourseResults] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [departmentResults, setDepartmentResults] = useState([]);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeExpiresAt, setCodeExpiresAt] = useState(null);
  const [codeTimeLeft, setCodeTimeLeft] = useState(0);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isInstitutionVerified, setIsInstitutionVerified] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (event) => {
    setFormData((current) => {
      const next = {
        ...current,
        [event.target.name]: event.target.value,
      };

      if (event.target.name === 'role') {
        if (event.target.value === 'workplace_supervisor') {
          next.institutionName = '';
          next.institutionEmail = '';
          next.institutionVerificationCode = '';
          next.courseName = '';
          next.departmentName = '';
          next.departmentId = '';
          setCodeSent(false);
          setCodeExpiresAt(null);
          setIsInstitutionVerified(false);
          setCourseResults([]);
          setDepartmentResults([]);
          setShowCourseDropdown(false);
          setShowDepartmentDropdown(false);
        } else if (event.target.value === 'student') {
          next.organizationName = '';
          next.organizationId = '';
          next.departmentName = '';
          next.departmentId = '';
          setDepartmentResults([]);
          setShowDepartmentDropdown(false);
        } else if (event.target.value === 'academic_supervisor') {
          next.organizationName = '';
          next.organizationId = '';
          next.courseName = '';
          setCourseResults([]);
          setShowCourseDropdown(false);
        } else {
          next.organizationName = '';
          next.organizationId = '';
        }
      }

      if (event.target.name === 'institutionEmail' || event.target.name === 'institutionVerificationCode') {
        setIsInstitutionVerified(false);
      }

      if (event.target.name === 'courseName') {
        setShowCourseDropdown(true);
      }

      if (event.target.name === 'departmentName') {
        next.departmentId = '';
        setShowDepartmentDropdown(true);
      }

      return next;
    });

    if (event.target.name === 'organizationName') {
      setFormData((current) => ({ ...current, organizationId: '' }));
      setShowOrgDropdown(true);
    }
  };

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await departmentsAPI.getDepartments();
        setDepartmentOptions(res?.results || res || []);
      } catch {
        setDepartmentOptions([]);
      }
    };

    loadDepartments();
  }, []);

  useEffect(() => {
    const isWorkplace = formData.role === 'workplace_supervisor';
    const query = (formData.organizationName || '').trim();
    if (!isWorkplace || query.length < 2) {
      setOrganizationResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const res = await authAPI.getOrganizationSuggestions(query);
        setOrganizationResults(res?.results || []);
      } catch {
        setOrganizationResults([]);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [formData.role, formData.organizationName]);

  useEffect(() => {
    const isStudent = formData.role === 'student';
    const query = (formData.courseName || '').trim();
    if (!isStudent || query.length < 2) {
      setCourseResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const res = await authAPI.getCourseSuggestions(query);
        setCourseResults(res?.results || []);
      } catch {
        setCourseResults([]);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [formData.role, formData.courseName]);

  useEffect(() => {
    const isAcademicSupervisor = formData.role === 'academic_supervisor';
    const query = (formData.departmentName || '').trim().toLowerCase();
    if (!isAcademicSupervisor || query.length < 2) {
      setDepartmentResults([]);
      return;
    }

    const filtered = departmentOptions.filter((department) => {
      const haystack = [department.department_name, department.faculty, department.university]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    }).slice(0, 10);

    setDepartmentResults(filtered);
  }, [formData.role, formData.departmentName, departmentOptions]);

  useEffect(() => {
    if (!codeExpiresAt) {
      setCodeTimeLeft(0);
      return;
    }

    const tick = () => {
      const secondsLeft = Math.max(0, Math.ceil((codeExpiresAt - Date.now()) / 1000));
      setCodeTimeLeft(secondsLeft);
      if (secondsLeft === 0) {
        setCodeSent(false);
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [codeExpiresAt]);

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleOrganizationSelect = (org) => {
    setFormData((current) => ({
      ...current,
      organizationName: org.name,
      organizationId: org.organization_id,
    }));
    setShowOrgDropdown(false);
  };

  const handleCourseSelect = (course) => {
    setFormData((current) => ({
      ...current,
      courseName: course.name,
    }));
    setShowCourseDropdown(false);
  };

  const handleDepartmentSelect = (department) => {
    setFormData((current) => ({
      ...current,
      departmentName: department.department_name,
      departmentId: department.department_id,
    }));
    setShowDepartmentDropdown(false);
  };

  const handleSendInstitutionCode = async () => {
    setError('');
    setSuccess('');

    const institutionEmail = (formData.institutionEmail || '').trim();
    if (!institutionEmail) {
      setError('Please enter institution email first.');
      return;
    }

    setIsSendingCode(true);
    try {
      await authAPI.sendInstitutionVerificationCode(institutionEmail);
      setCodeSent(true);
      setCodeExpiresAt(Date.now() + (CODE_EXPIRY_SECONDS * 1000));
      setIsInstitutionVerified(false);
      setSuccess('Verification code sent to institution email.');
    } catch (err) {
      const apiError = err?.response?.data;
      // Debug: log full API error to console for easier inspection
      // (helps diagnose 400 responses shown in browser network tab)
      // eslint-disable-next-line no-console
      console.debug('sendInstitutionVerificationCode error:', err?.response || err);
      if (typeof apiError === 'string') {
        setError(apiError);
      } else {
        setError(apiError?.error || 'Failed to send verification code.');
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyInstitutionCode = async () => {
    setError('');
    setSuccess('');

    const institutionEmail = (formData.institutionEmail || '').trim();
    const verificationCode = (formData.institutionVerificationCode || '').trim();

    if (!institutionEmail) {
      setError('Please enter institution email first.');
      return;
    }

    if (!verificationCode) {
      setError('Please enter the verification code.');
      return;
    }

    if (codeTimeLeft === 0) {
      setError('Institution verification code expired. Please resend a new code.');
      return;
    }

    setIsVerifyingCode(true);
    try {
      await authAPI.verifyInstitutionVerificationCode(institutionEmail, verificationCode);
      setIsInstitutionVerified(true);
      setSuccess('Institution email verified successfully.');
    } catch (err) {
      const apiError = err?.response?.data;
      // eslint-disable-next-line no-console
      console.debug('verifyInstitutionVerificationCode error:', err?.response || err);
      setIsInstitutionVerified(false);
      if (typeof apiError === 'string') {
        setError(apiError);
      } else {
        setError(apiError?.error || 'Failed to verify institution code.');
      }
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleChangeInstitutionEmail = () => {
    setIsInstitutionVerified(false);
    setCodeSent(false);
    setCodeExpiresAt(null);
    setFormData((current) => ({
      ...current,
      institutionVerificationCode: '',
    }));
    setSuccess('Institution email unlocked. Update it and send a new code.');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.role === 'workplace_supervisor' && !(formData.organizationName || '').trim()) {
      setError('Organization name is required for workplace supervisors.');
      return;
    }

    if ((formData.role === 'student' || formData.role === 'academic_supervisor') && !(formData.institutionName || '').trim()) {
      setError('Institution is required for students and academic supervisors.');
      return;
    }

    if (formData.role === 'student' && !(formData.courseName || '').trim()) {
      setError('Course is required for students.');
      return;
    }

    let selectedDepartmentId = formData.departmentId;

    if (formData.role === 'academic_supervisor' && !selectedDepartmentId) {
      const selectedDepartment = departmentOptions.find((department) => {
        const value = (formData.departmentName || '').trim().toLowerCase();
        return value && department.department_name?.trim().toLowerCase() === value;
      });

      if (!selectedDepartment) {
        setError('Please choose a department from the suggestions.');
        return;
      }

      selectedDepartmentId = selectedDepartment.department_id;
      setFormData((current) => ({
        ...current,
        departmentId: selectedDepartment.department_id,
        departmentName: selectedDepartment.department_name,
      }));
    }

    if ((formData.role === 'student' || formData.role === 'academic_supervisor') && !(formData.institutionEmail || '').trim()) {
      setError('Institution email is required for students and academic supervisors.');
      return;
    }

    if ((formData.role === 'student' || formData.role === 'academic_supervisor') && !(formData.institutionVerificationCode || '').trim()) {
      setError('Institution verification code is required.');
      return;
    }

    if ((formData.role === 'student' || formData.role === 'academic_supervisor') && codeTimeLeft === 0) {
      setError('Institution verification code expired. Please resend a new code.');
      return;
    }

    if ((formData.role === 'student' || formData.role === 'academic_supervisor') && !isInstitutionVerified) {
      setError('Please verify your institution email before registering.');
      return;
    }

    setIsLoading(true);

    try {
      const roleMap = {
        student: 'Student',
        workplace_supervisor: 'Workplace Supervisor',
        academic_supervisor: 'Academic Supervisor',
      };

      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: roleMap[formData.role] || 'Student',
        course: formData.courseName || undefined,
        department_id: selectedDepartmentId || undefined,
        institution_name: formData.institutionName || undefined,
        institution_email: formData.institutionEmail || undefined,
        institution_verification_code: formData.institutionVerificationCode || undefined,
        organization_name: formData.organizationName || undefined,
        organization_id: formData.organizationId || undefined,
      };

      await authAPI.register(payload);
      setSuccess('Account created successfully. Signing you in...');
      await login(formData.email, formData.password);
      navigate('/app/dashboard');
    } catch (err) {
      const apiError = err?.response?.data;
      // eslint-disable-next-line no-console
      console.debug('register error response:', err?.response || err);
      if (typeof apiError === 'string') {
        setError(apiError);
      } else if (apiError?.email?.length) {
        setError(apiError.email[0]);
      } else if (apiError?.password?.length) {
        setError(apiError.password[0]);
      } else if (apiError?.role?.length) {
        setError(apiError.role[0]);
      } else if (apiError?.institution_name?.length) {
        setError(apiError.institution_name[0]);
      } else if (apiError?.institution_email?.length) {
        setError(apiError.institution_email[0]);
      } else if (apiError?.institution_verification_code?.length) {
        setError(apiError.institution_verification_code[0]);
      } else if (apiError?.organization_name?.length) {
        setError(apiError.organization_name[0]);
      } else {
        setError('Registration failed. Please check your inputs and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-main">
        <aside className="register-left-panel">
          <div>
            <p className="register-eyebrow">Join ILES</p>
            <h1 className="left-panel-headline">Create your account and start managing internship work with clarity.</h1>
            <p className="left-panel-subtext">
              Register as a student, workplace supervisor, or academic supervisor to access logs, reviews, reports, and feedback in one place.
            </p>

            <div className="feature-list">
              <div className="feature-card">
                <div className="feature-card-title">Structured internship tracking</div>
                <div className="feature-card-desc">Keep placements, submissions, and feedback aligned from day one.</div>
              </div>
              <div className="feature-card">
                <div className="feature-card-title">Supervisor-ready workflows</div>
                <div className="feature-card-desc">Review, approve, and evaluate activity with consistent role access.</div>
              </div>
            </div>
          </div>

          <div className="left-panel-social-proof">
            <div className="avatar-stack">
              <div className="avatar">S</div>
              <div className="avatar">A</div>
              <div className="avatar">W</div>
            </div>
            <div className="social-proof-text">Built for students and supervisors working on internship progress together.</div>
          </div>
        </aside>

        <main className="register-right-panel">
          <div className="register-form-container">
            <div className="register-card-header">
              <div>
                <h2>Register for ILES</h2>
                <p className="register-card-subtitle">Enter your details to create a new account.</p>
              </div>
              <Link to="/login" className="already-registered-link">Already have an account?</Link>
            </div>

            <form onSubmit={handleSubmit} className="register-form">
              <div className="form-section-label">Account Details</div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="no-icon"
                    placeholder="Jane"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="no-icon"
                    placeholder="Doe"
                  />
                </div>
              </div>

              {formData.role === 'workplace_supervisor' && (
                <div className="form-group org-search-group">
                  <label htmlFor="organizationName">Organization / Company</label>
                  <input
                    type="text"
                    id="organizationName"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleChange}
                    onFocus={() => setShowOrgDropdown(true)}
                    onBlur={() => window.setTimeout(() => setShowOrgDropdown(false), 120)}
                    required
                    className="no-icon"
                    placeholder="Type to search existing organizations"
                  />
                  {showOrgDropdown && organizationResults.length > 0 && (
                    <div className="org-dropdown">
                      {organizationResults.map((org) => (
                        <button
                          key={org.organization_id}
                          type="button"
                          className="org-option"
                          onMouseDown={() => handleOrganizationSelect(org)}
                        >
                          {org.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <small className="org-help-text">
                    If no existing result matches, keep typing and it will be created as a new organization.
                  </small>
                </div>
              )}

              {formData.role === 'student' && (
                <>
                  <div className="form-group">
                    <label htmlFor="institutionName">Institution</label>
                    <input
                      type="text"
                      id="institutionName"
                      name="institutionName"
                      value={formData.institutionName}
                      onChange={handleChange}
                      required
                      className="no-icon"
                      placeholder="e.g. Makerere University"
                    />
                  </div>

                  <div className="form-group course-search-group">
                    <label htmlFor="courseName">Course</label>
                    <input
                      type="text"
                      id="courseName"
                      name="courseName"
                      value={formData.courseName}
                      onChange={handleChange}
                      onFocus={() => setShowCourseDropdown(true)}
                      onBlur={() => window.setTimeout(() => setShowCourseDropdown(false), 120)}
                      required
                      className="no-icon"
                      placeholder="Type to search existing courses"
                    />
                    {showCourseDropdown && courseResults.length > 0 && (
                      <div className="autocomplete-dropdown">
                        {courseResults.map((course) => (
                          <button
                            key={course.name}
                            type="button"
                            className="autocomplete-option"
                            onMouseDown={() => handleCourseSelect(course)}
                          >
                            {course.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="institutionEmail">
                      Institution Email
                      {isInstitutionVerified && (
                        <span className="verified-badge">
                          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false">
                            <path d="M7 10V8a5 5 0 1 1 10 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1zm2 0h6V8a3 3 0 1 0-6 0v2z" />
                          </svg>
                          Verified
                        </span>
                      )}
                    </label>
                    <div className="verification-row">
                      <input
                        type="email"
                        id="institutionEmail"
                        name="institutionEmail"
                        value={formData.institutionEmail}
                        onChange={handleChange}
                        disabled={isInstitutionVerified}
                        required
                        className="no-icon"
                        placeholder="you@institution.edu"
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleSendInstitutionCode}
                        disabled={isSendingCode || isInstitutionVerified}
                      >
                        {isSendingCode ? 'Sending...' : (codeSent ? 'Resend Code' : 'Send Code')}
                      </button>
                    </div>
                    {isInstitutionVerified && (
                      <button
                        type="button"
                        className="change-email-btn"
                        onClick={handleChangeInstitutionEmail}
                      >
                        Change Email
                      </button>
                    )}
                  </div>

                  {isInstitutionVerified ? (
                    <div className="verification-status-row" role="status" aria-live="polite">
                      <span className="verification-status-dot" aria-hidden="true" />
                      Institution email verified. You can continue registration.
                    </div>
                  ) : (
                    <div className="form-group">
                      <label htmlFor="institutionVerificationCode">Verification Code</label>
                      <input
                        type="text"
                        id="institutionVerificationCode"
                        name="institutionVerificationCode"
                        value={formData.institutionVerificationCode}
                        onChange={handleChange}
                        required
                        className="no-icon"
                        placeholder="Enter 6-digit code"
                      />
                      <button
                        type="button"
                        className="btn btn-secondary verify-btn"
                        onClick={handleVerifyInstitutionCode}
                        disabled={isVerifyingCode || !codeSent || codeTimeLeft === 0}
                      >
                        {isVerifyingCode ? 'Verifying...' : 'Verify Code'}
                      </button>
                      {codeSent && codeTimeLeft > 0 && (
                        <small className="verification-timer">Code expires in {formatCountdown(codeTimeLeft)}</small>
                      )}
                      {!codeSent && codeExpiresAt && codeTimeLeft === 0 && (
                        <small className="verification-expired">Code expired. Click Send Code to get a new one.</small>
                      )}
                    </div>
                  )}
                </>
              )}

              {formData.role === 'academic_supervisor' && (
                <div className="form-group department-search-group">
                  <label htmlFor="departmentName">Department</label>
                  <input
                    type="text"
                    id="departmentName"
                    name="departmentName"
                    value={formData.departmentName}
                    onChange={handleChange}
                    onFocus={() => setShowDepartmentDropdown(true)}
                    onBlur={() => window.setTimeout(() => setShowDepartmentDropdown(false), 120)}
                    required
                    className="no-icon"
                    placeholder="Type to search existing departments"
                  />
                  {showDepartmentDropdown && departmentResults.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {departmentResults.map((department) => (
                        <button
                          key={department.department_id}
                          type="button"
                          className="autocomplete-option"
                          onMouseDown={() => handleDepartmentSelect(department)}
                        >
                          {department.department_name} • {department.faculty}
                        </button>
                      ))}
                    </div>
                  )}
                  <small className="org-help-text">
                    Choose a department from the list so the profile can be linked to the saved database record.
                  </small>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="no-icon"
                  placeholder="name@university.edu"
                />
              </div>

              <div className="form-section-label">Role & Security</div>
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <div className="select-wrapper">
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                  >
                    <option value="student">Student</option>
                    <option value="workplace_supervisor">Workplace Supervisor</option>
                    <option value="academic_supervisor">Academic Supervisor</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="no-icon"
                    placeholder="Create a password"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="no-icon"
                    placeholder="Repeat your password"
                  />
                </div>
              </div>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <button type="submit" disabled={isLoading} className="btn btn-primary">
                {isLoading ? 'Registering...' : 'Register'}
              </button>

              <div className="register-links">
                <span>Need help? <Link to="/contact" className="contact-support-link">Contact support</Link></span>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default RegisterPage;