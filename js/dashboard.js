// Simple multi-step navigation control for dashboard

document.addEventListener('DOMContentLoaded', () => {
  const steps = document.querySelectorAll('.step-section');
  let currentStep = 0;

  const showStep = index => {
    steps.forEach((s, i) => {
      s.classList.toggle('active', i === index);
    });
  };

  // Example form submit handler (Step 1)
  const userDetailsForm = document.getElementById('userDetailsForm');
  if (userDetailsForm) {
    userDetailsForm.addEventListener('submit', e => {
      e.preventDefault();
      // Validate if needed, then proceed
      currentStep = 1;
      showStep(currentStep);
    });
  }

  // Functions to switch steps (could be wired from buttons)
  window.goToStep = index => {
    currentStep = index;
    showStep(currentStep);
  };

  // Modal open/close handlers
  const modal = document.getElementById('doctorModal');
  window.openDoctorModal = () => {
    modal.classList.add('show');
  };
  window.closeDoctorModal = () => {
    modal.classList.remove('show');
  };

  // Form submission for doctor modal
  const doctorForm = document.getElementById('doctorForm');
  if (doctorForm) {
    doctorForm.addEventListener('submit', e => {
      e.preventDefault();
      // You can add form validation & sending logic here
      alert('Report sent to doctor successfully!');
      window.closeDoctorModal();
    });
  }
});
