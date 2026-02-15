import { LightningElement, track, wire } from 'lwc';
import { loadStyle } from 'lightning/platformResourceLoader';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import removeDateFormatStyle from '@salesforce/resourceUrl/RemoveDateFormatStyle';
import getAllSpendings from '@salesforce/apex/TrackSpendController.getAllSpendings';
import getCategoriesBySpending from '@salesforce/apex/TrackSpendController.getCategoriesBySpending';
import getExpensesByFilters from '@salesforce/apex/TrackSpendController.getExpensesByFilters';
import deleteExpense from '@salesforce/apex/TrackSpendController.deleteExpense';

export default class TrackSpendApp extends LightningElement {
    @track startDate;
    @track endDate;
    @track spendingId = 'All';
    @track categoryId = 'All';
    @track spendingOptions = [{ label: 'All', value: 'All' }];
    @track categoryOptions = [{ label: 'All', value: 'All' }];
    @track allRows = [];
    @track rowsToDisplay = [];
    @track totalIncome = 0;
    @track totalExpense = 0;
    @track net = 0;
    @track sortedBy;
    @track sortedDirection = 'asc';
    @track isLoading = false;
    @track isModalOpen = false;

    visibleCount = 20;
    wiredExpenseResult;

    columns = [
        { label: 'Date', fieldName: 'expenseDate', type: 'date', sortable: true },
        {
            label: 'Expense Name',
            fieldName: 'recordLink',
            type: 'url',
            sortable: true,
            typeAttributes: { label: { fieldName: 'name' }, target: '_blank' }
        },
        { label: 'Category', fieldName: 'category', sortable: true },
        { label: 'Spending', fieldName: 'spending', sortable: true },
        { label: 'Bank', fieldName: 'bank', sortable: true },
        { label: 'Type', fieldName: 'transactionType', sortable: true },
        {
            label: 'Amount',
            fieldName: 'amount',
            type: 'currency',
            typeAttributes: { currencyCode: 'PHP' },
            sortable: true
        },
        {
            type: 'button-icon',
            fixedWidth: 50,
            typeAttributes: {
                iconName: 'utility:delete',
                title: 'Delete',
                variant: 'bare',
                alternativeText: 'Delete'
            }
        }
    ];

    renderedCallback() {
        loadStyle(this, removeDateFormatStyle);
    }

    connectedCallback() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const format = (d) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
                d.getDate()
            ).padStart(2, '0')}`;
        this.startDate = format(firstDay);
        this.endDate = format(today);
    }

    @wire(getAllSpendings)
    wiredSpendings({ error, data }) {
        if (data) {
            this.spendingOptions = [
                { label: 'All', value: 'All' },
                ...data.map((s) => ({ label: s.Name, value: s.Id }))
            ];
        } else if (error) console.error('Error fetching spendings:', error);
    }

    @wire(getCategoriesBySpending, { spendingId: '$spendingId' })
    wiredCategories({ error, data }) {
        if (data) {
            this.categoryOptions = [
                { label: 'All', value: 'All' },
                ...data.map((c) => ({ label: c.Name, value: c.Id }))
            ];
        } else if (error) console.error('Error fetching categories:', error);
    }

    @wire(getExpensesByFilters, {
        spendingId: '$spendingId',
        categoryId: '$categoryId',
        startDate: '$startDate',
        endDate: '$endDate'
    })
    wiredExpenses(result) {
        this.wiredExpenseResult = result;
        const { error, data } = result;
        if (data) {
            this.allRows = data.map((r) => ({
                id: r.Id,
                expenseDate: r.Expense_Date__c,
                name: r.Name,
                recordLink: '/' + r.Id,
                category: r.Category__r?.Name,
                spending: r.Category__r?.Spending__r?.Name,
                bank: r.Bank__c,
                transactionType: r.Transaction_Type__c,
                amount: r.Amount__c
            }));
            this.calculateSummary();
            this.rowsToDisplay = this.allRows.slice(0, this.visibleCount);
        } else if (error) console.error('Error loading expenses:', error);
    }

    calculateSummary() {
        let income = 0,
            expense = 0;
        this.allRows.forEach((r) =>
            r.transactionType === 'Income' ? (income += r.amount) : (expense += r.amount)
        );
        this.totalIncome = income;
        this.totalExpense = expense;
        this.net = income - expense;
    }

    async handleLoadMore() {
        if (this.rowsToDisplay.length >= this.allRows.length) return;
        this.isLoading = true;
        await new Promise((r) => setTimeout(r, 500));
        this.visibleCount += 10;
        this.rowsToDisplay = this.allRows.slice(0, this.visibleCount);
        this.isLoading = false;
    }

    handleSort(event) {
        const { fieldName, sortDirection } = event.detail;
        this.sortedBy = fieldName;
        this.sortedDirection = sortDirection;
        const isAsc = sortDirection === 'asc';
        this.rowsToDisplay = [...this.rowsToDisplay].sort((a, b) =>
            a[fieldName] > b[fieldName] ? (isAsc ? 1 : -1) : (isAsc ? -1 : 1)
        );
    }

    handleChange(e) {
        const field = e.target.dataset.field;
        this[field] = e.detail.value;
        if (field === 'spendingId') this.categoryId = 'All';
    }

    openModal() {
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    async handleSuccess() {
        // Show toast (only once)
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Expense saved successfully!',
                variant: 'success'
            })
        );

        // Clear fields in modal
        this.template.querySelectorAll('lightning-input-field').forEach((f) => {
            if (f && 'value' in f) f.value = null;
        });

        // Wait and refresh table
        await new Promise((resolve) => setTimeout(resolve, 300));
        await refreshApex(this.wiredExpenseResult);
        this.calculateSummary();
    }

    handleError(event) {
        console.error('Error creating expense:', event.detail);
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: event.detail?.message || 'Failed to create expense.',
                variant: 'error'
            })
        );
    }

    async handleRowAction(event) {
        const recordId = event.detail.row.id;
        if (!recordId) return;

        if (confirm('Are you sure you want to delete this expense?')) {
            try {
                await deleteExpense({ expenseId: recordId });
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Deleted',
                        message: 'Expense deleted successfully!',
                        variant: 'success'
                    })
                );
                await refreshApex(this.wiredExpenseResult);
            } catch (error) {
                console.error('Error deleting expense:', error);
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: error.body?.message || 'Failed to delete expense.',
                        variant: 'error'
                    })
                );
            }
        }
    }

    closeModal() {
        const modal = this.template.querySelector('.slds-modal');
        if (modal) {
            modal.classList.remove('fade-in');
            modal.classList.add('fade-out');

            // Wait for fade-out animation before hiding
            setTimeout(() => {
                this.isModalOpen = false;
            }, 250);
        } else {
            this.isModalOpen = false;
        }
    }

    openModal() {
        this.isModalOpen = true;
        setTimeout(() => {
            const modal = this.template.querySelector('.slds-modal');
            if (modal) modal.classList.add('fade-in');
        }, 10);
    }
}
