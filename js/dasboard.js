document.addEventListener('DOMContentLoaded', () => {
  const steps = document.querySelectorAll('.step-section');
  let currentStep = 0;

  function showStep(index) {
    steps.forEach((s, i) => s.classList.toggle('active', i === index));
  }

  showStep(currentStep); // Show first step initially

  // Handle Step 1 form submission to go to Step 2
  const userDetailsForm = document.getElementById('userDetailsForm');
  if (userDetailsForm) {
    userDetailsForm.addEventListener('submit', e => {
      e.preventDefault();
      // Optionally validate inputs here

      currentStep = 1; // Step 2 index
      showStep(currentStep);
    });
  }

  // Optional: Expose function to switch steps programmatically
  window.goToStep = index => {
    currentStep = index;
    showStep(currentStep);
  };
});
