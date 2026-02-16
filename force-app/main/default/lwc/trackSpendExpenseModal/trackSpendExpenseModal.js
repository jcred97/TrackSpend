import { LightningElement, api, track } from 'lwc';

export default class TrackSpendExpenseModal extends LightningElement {

    @api isOpen = false;

    @track isClosing = false;
    @track isRendered = false;

    _handleKeyDown;
    _previouslyFocusedElement;

    renderedCallback() {
        if (this.isOpen && !this.isRendered) {
            this.isRendered = true;

            // 🔒 Prevent background scroll
            document.body.style.overflow = 'hidden';

            // Save previously focused element
            this._previouslyFocusedElement = document.activeElement;

            // Add keyboard listener
            this._handleKeyDown = this.handleKeyDown.bind(this);
            document.addEventListener('keydown', this._handleKeyDown);

            // 🎯 Focus first focusable element
            setTimeout(() => {
                const focusable = this.getFocusableElements();
                if (focusable.length > 0) {
                    focusable[0].focus();
                }
            });
        }
    }

    handleClose() {
        this.isClosing = true;

        const modal = this.template.querySelector('.slds-modal');

        modal.addEventListener('animationend', () => {

            this.isClosing = false;
            this.isRendered = false;

            // 🔒 Restore scroll
            document.body.style.overflow = '';

            // Remove keyboard listener
            document.removeEventListener('keydown', this._handleKeyDown);

            // 🎯 Restore focus to opener
            if (this._previouslyFocusedElement) {
                this._previouslyFocusedElement.focus();
            }

            this.dispatchEvent(new CustomEvent('close'));

        }, { once: true });
    }

    handleKeyDown(event) {

        // ⌨ ESC Close
        if (event.key === 'Escape') {
            this.handleClose();
            return;
        }

        // 🎯 Focus trap
        if (event.key === 'Tab') {

            const focusable = this.getFocusableElements();

            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    }

    getFocusableElements() {
        return Array.from(
            this.template.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
        );
    }

    handleSuccess() {
        this.template.querySelectorAll('lightning-input-field').forEach(field => {
            if (field && 'value' in field) {
                field.value = null;
            }
        });

        //this.handleClose();
        this.dispatchEvent(new CustomEvent('success'));
    }

    handleError(event) {
        console.error('Error creating expense:', event.detail);
    }

    get modalClass() {
        return `slds-modal slds-fade-in-open ${this.isClosing ? 'fade-out' : 'fade-in'}`;
    }

    get backdropClass() {
        return `slds-backdrop ${this.isClosing ? '' : 'slds-backdrop_open'}`;
    }
}
