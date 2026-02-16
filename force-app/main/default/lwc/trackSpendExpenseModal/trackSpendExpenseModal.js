import { LightningElement, api, track } from 'lwc';

export default class TrackSpendExpenseModal extends LightningElement {

    @api isOpen = false;
    @track isClosing = false;

    handleClose() {
        this.isClosing = true;

        const modal = this.template.querySelector('.slds-modal');
        modal.addEventListener('animationend', () => {
            this.isClosing = false;
            this.dispatchEvent(new CustomEvent('close'));
        }, { once: true });
    }

    handleSuccess() {
        this.template.querySelectorAll('lightning-input-field').forEach(field => {
            if (field && 'value' in field) {
                field.value = null;
            }
        });

        this.handleClose();
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
