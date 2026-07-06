(function() {
    'use strict';

    // Shared, product-aware endpoint on the CW worker (branches on `product`).
    const REFUND_URL = 'https://carnivore-report-api-production.iambrew.workers.dev/api/v1/refund-request';

    const RATE_LIMIT_KEY = 'kd_refund_last_submit';
    const RATE_LIMIT_MS = 60000; // 1 minute between submissions

    let refundModal, refundForm, refundTextarea, refundEmail, refundCategory;
    let formView, successView, errorView;
    let submitButton, cancelButton, closeButton, retryButton, closeSuccessButton;
    let charCount;

    function checkRateLimit() {
        const lastSubmit = localStorage.getItem(RATE_LIMIT_KEY);
        if (!lastSubmit) return true;
        return (Date.now() - parseInt(lastSubmit, 10)) > RATE_LIMIT_MS;
    }

    function init() {
        refundModal = document.getElementById('refund-modal');
        refundForm = document.getElementById('refund-form');
        refundTextarea = document.getElementById('refund-reason');
        refundEmail = document.getElementById('refund-email');
        refundCategory = document.getElementById('refund-category');

        formView = document.querySelector('.refund-form-view');
        successView = document.querySelector('.refund-success-view');
        errorView = document.querySelector('.refund-error-view');

        submitButton = document.getElementById('refund-submit');
        cancelButton = document.getElementById('refund-cancel');
        closeButton = document.querySelector('.refund-modal-close');
        retryButton = document.getElementById('refund-retry');
        closeSuccessButton = document.getElementById('refund-close-success');

        charCount = document.querySelector('.refund-form .char-count');

        if (!refundModal) {
            console.warn('Refund modal not found');
            return;
        }

        document.querySelectorAll('[data-open-refund-modal]').forEach((el) => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                openModal();
            });
        });

        closeButton.addEventListener('click', closeModal);
        cancelButton.addEventListener('click', closeModal);
        closeSuccessButton.addEventListener('click', closeModal);
        retryButton.addEventListener('click', resetToForm);

        refundForm.addEventListener('submit', handleSubmit);
        refundTextarea.addEventListener('input', updateCharCount);

        refundModal.querySelector('.refund-modal-overlay').addEventListener('click', closeModal);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && refundModal.style.display !== 'none') {
                closeModal();
            }
        });
    }

    function openModal() {
        if (!checkRateLimit()) {
            alert('Please wait a moment before submitting another request.');
            return;
        }
        refundModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        refundEmail.focus();
    }

    function closeModal() {
        refundModal.style.display = 'none';
        document.body.style.overflow = '';
        setTimeout(resetToForm, 300);
    }

    function resetToForm() {
        formView.style.display = 'block';
        successView.style.display = 'none';
        errorView.style.display = 'none';
        refundForm.reset();
        updateCharCount();

        submitButton.disabled = false;
        submitButton.querySelector('.button-text').style.display = 'inline';
        submitButton.querySelector('.button-loading').style.display = 'none';
    }

    function updateCharCount() {
        const length = refundTextarea.value.length;
        charCount.textContent = length;
        charCount.style.color = length > 950 ? '#ef4444' : '';
    }

    function getRadioValue(name) {
        const checked = refundForm.querySelector(`input[name="${name}"]:checked`);
        return checked ? checked.value : null;
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const email = refundEmail.value.trim();
        const reasonCategory = refundCategory.value;
        const reasonText = refundTextarea.value.trim();
        const overallRating = getRadioValue('overall_rating');
        const mealPlanFeedback = getRadioValue('meal_plan_feedback');
        const doctorScriptFeedback = getRadioValue('doctor_script_feedback');
        const technicalNotes = document.getElementById('refund-technical').value.trim();
        const additionalNotes = document.getElementById('refund-additional').value.trim();

        if (!email) { alert('Please enter the email you used for your purchase.'); return; }
        if (!reasonCategory) { alert('Please choose a reason.'); return; }
        if (!overallRating) { alert('Please rate the overall quality 1-5.'); return; }
        if (!mealPlanFeedback || !doctorScriptFeedback) { alert('Please rate both report sections.'); return; }
        if (reasonText.length < 10) { alert('Please tell us a bit more (10 characters minimum).'); return; }
        if (reasonText.length > 1000) { alert('Please keep your explanation under 1000 characters.'); return; }

        if (!checkRateLimit()) {
            showError('Please wait a moment before submitting another request.');
            return;
        }

        submitButton.disabled = true;
        submitButton.querySelector('.button-text').style.display = 'none';
        submitButton.querySelector('.button-loading').style.display = 'inline-block';

        try {
            const response = await fetch(REFUND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    product: 'ketodial_report',
                    reason_category: reasonCategory,
                    reason_text: reasonText,
                    overall_rating: overallRating,
                    meal_plan_feedback: mealPlanFeedback,
                    doctor_script_feedback: doctorScriptFeedback,
                    technical_notes: technicalNotes || null,
                    additional_notes: additionalNotes || null
                })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());
                showSuccess();
            } else {
                throw new Error(data.message || 'Submission failed');
            }
        } catch (error) {
            console.error('Refund request submission error:', error);
            showError('Something went wrong. Please try again later.');

            submitButton.disabled = false;
            submitButton.querySelector('.button-text').style.display = 'inline';
            submitButton.querySelector('.button-loading').style.display = 'none';
        }
    }

    function showSuccess() {
        formView.style.display = 'none';
        successView.style.display = 'block';
    }

    function showError(message) {
        formView.style.display = 'none';
        errorView.style.display = 'block';
        errorView.querySelector('.error-detail').textContent = message;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
