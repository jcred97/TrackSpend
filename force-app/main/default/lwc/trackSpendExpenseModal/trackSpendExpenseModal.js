import { LightningElement, api } from 'lwc';

export default class TrackSpendExpenseModal extends LightningElement {

    @api isOpen = false;

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleSuccess() {
        this.template.querySelectorAll('lightning-input-field').forEach(field => {
            if (field && 'value' in field) {
                field.value = null;
            }
        });

        this.dispatchEvent(new CustomEvent('success'));
    }

    handleError(event) {
        console.error('Error creating expense:', event.detail);
    }
}
