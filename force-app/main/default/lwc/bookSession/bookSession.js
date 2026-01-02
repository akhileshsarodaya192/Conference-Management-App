import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { subscribe, unsubscribe, MessageContext } from 'lightning/messageService';
import SPEAKER_CHANNEL from '@salesforce/messageChannel/speakerSelectionChannel__c';

import checkAvailability from '@salesforce/apex/SpeakerController.checkAvailability';
import createAssignment from '@salesforce/apex/SpeakerController.createAssignment';
import getCalendarAvailability from '@salesforce/apex/SpeakerController.getCalendarAvailability';
import getSpeakerDetails from '@salesforce/apex/SpeakerController.getSpeakerDetails';

export default class BookSession extends LightningElement {
    @track speakerId;
    @track speakerName;
    @track selectedSpeaker = null;
    
    @track selectedDate;
    @track isAvailable = false;
    @track isOldDate = false;
    @track checkingAvailability = false;
    @track creatingAssignment = false;
    
    @track calendarData = {};
    @track calendarDays = [];
    @track calendarLoading = false;
    
    subscription = null;
    @wire(MessageContext) messageContext;

    get todayDisplay() {
        const today = new Date();
        return today.toLocaleDateString();
    }

    get minDate() {
        const today = new Date();
        today.setDate(today.getDate() + 1);
        return today.toISOString().split('T')[0];
    }

    get hasSpeaker() {
        return !!this.speakerId && !!this.selectedSpeaker;
    }

    get isCreateButtonDisabled() {
        return !this.speakerId || 
            !this.selectedDate || 
            !this.isAvailable || 
            this.checkingAvailability || 
            this.creatingAssignment;
    }

    connectedCallback() {
        this.subscribeToChannel();
    }

    disconnectedCallback() {
        this.unsubscribeFromChannel();
    }

    subscribeToChannel() {
        if (!this.subscription) {
            this.subscription = subscribe(
                this.messageContext,
                SPEAKER_CHANNEL,
                (message) => {
                    console.log('LMS Received:', message);
                    if (message.speakerId) {
                        this.handleSpeakerSelected(message.speakerId);
                        this.speakerName = message.speakerName;//marked
                    }
                }
            );
        }
    }

    unsubscribeFromChannel() {
        if (this.subscription) {
            unsubscribe(this.subscription);
            this.subscription = null;
        }
    }

    async handleSpeakerSelected(speakerId) {
        this.speakerId = speakerId;
        
        try {
            // Fetching speaker details
            this.selectedSpeaker = await getSpeakerDetails({ speakerId: speakerId });
            console.log('Selected speaker:', this.selectedSpeaker);
            
            // Checking calendar availability
            await this.loadCalendarAvailability();
        } catch (error) {
            console.error('Error loading speaker:', error);
            this.showToast('Error', 'Failed to load speaker details', 'error');
            this.clearSelection();
        }
    }

    clearSelection() {
        this.speakerId = null;
        this.selectedSpeaker = null;
        this.selectedDate = null;
        this.isAvailable = false;
        this.calendarData = {};
        this.calendarDays = [];
    }

    /*async handleDateChange(event) {
        this.selectedDate = event.target.value;
        this.isAvailable = false;

        if (!this.selectedDate || !this.speakerId) {
            return;
        }

        this.checkingAvailability = true;
        try {
            const available = await checkAvailability({
                speakerId: this.speakerId,
                sessionDate: this.selectedDate
            });

            this.isAvailable = available;
            
            if (!available) {
                this.showToast(
                    'Not Available', 
                    'Slot is already booked, try another date', 
                    'warning'
                );
            }
        } catch (error) {
            console.error('Availability check error:', error);
            this.showToast(
                'Error!',
                'Failed to check availability',
                'error'
            );
        } finally {
            this.checkingAvailability = false;
        }
    }*/
    
    async handleDateChange(event) {
    this.selectedDate = event.target.value;
    this.isAvailable = false;
    this.isOldDate = false;  
    this.checkingAvailability = false;

    if (!this.selectedDate || !this.speakerId) return;
    
    //Past date validation
    const today = new Date();
    const selectedDateObj = new Date(this.selectedDate + 'T00:00:00');
    
    if (selectedDateObj < today) {
        this.isOldDate = true;
        this.showToast(
            'You Chose a Past Date! ',
            `Cannot book for ${this.selectedDate}. Please select a future date.`,
            'error'
        );
        return; 
    }

    // Checking availability for the selected date
    this.checkingAvailability = true;
    try {
        const available = await checkAvailability({
            speakerId: this.speakerId,
            sessionDate: this.selectedDate
        });
        
        this.isAvailable = available;
        
        if (available) {
            this.showToast('Date is Available', 'Slot is Free to book!', 'success');
        } else {
            this.showToast('Slot is Booked', 'Please Try Another Date', 'warning');
        }
    } catch (error) {
        this.showToast('Error!', 'Availability check failed', 'error');
    } finally {
        this.checkingAvailability = false;
    }
}

    async handleCreateAssignment() {
        if (!this.speakerId || !this.selectedDate || !this.isAvailable) {
            return;
        }

        this.creatingAssignment = true;
        try {
            const assignmentId = await createAssignment({
                speakerId: this.speakerId,
                sessionDate: this.selectedDate,
                speciality: this.selectedSpeaker.Speciality__c
            });

            this.showToast(
                'Success!', 
                'Assignment created successfully! Record ID: ' + assignmentId, 
                'success'
            );

            await this.loadCalendarAvailability();
            
            this.selectedDate = null;
            this.isAvailable = false;

        } catch (error) {
            console.error('Create assignment error:', error);
            this.showToast(
                'Error', 
                'Failed to create assignment as the selected Speaker is already assigned to selected date', 
                'error');
        } finally {
            this.creatingAssignment = false;
        }
    }

    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(evt);
    }

    // Bonus: Calendar Availability (Next 7 days)
    async loadCalendarAvailability() {
        if (!this.speakerId) {
            this.calendarDays = [];
            return;
        }

        this.calendarLoading = true;
        try {
            this.calendarData = await getCalendarAvailability({
                speakerId: this.speakerId,
                daysAhead: 7
            });

            // Transform to display format
            this.calendarDays = this.buildCalendarDisplay();
        } catch (error) {
            console.error('Calendar load error:', error);
            this.calendarDays = [];
        } finally {
            this.calendarLoading = false;
        }
    }

    async refreshCalendar() {
        await this.loadCalendarAvailability();
    }

    //calender display method
    buildCalendarDisplay() {
        const days = [];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1); // Tomorrow

        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(startDate);
            checkDate.setDate(checkDate.getDate() + i);
            
            const dateKey = checkDate.toISOString().split('T')[0];
            const isAvailable = this.calendarData[dateKey] || true;
            
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            
            days.push({
                date: dateKey,
                dayLabel: dayNames[checkDate.getDay()],
                dateNumber: checkDate.getDate(),
                isAvailable: isAvailable,
                status: isAvailable ? 'Available' : 'Booked',
                
                // CSS classes for styling
                wrapperClass: 'slds-col slds-size_1-of-2 slds-medium-size_1-of-4 slds-p-around_xx-small',
                tileClass: `availability-tile ${isAvailable ? 'available' : 'booked'}`,
                statusClass: `status-badge ${isAvailable ? 'available' : 'booked'}`
            });
        }

        return days;
    }
}
