import { LightningElement, api, wire } from 'lwc';
import {publish, MessageContext } from 'lightning/messageService';
import SPEAKER_CHANNEL from '@salesforce/messageChannel/speakerSelectionChannel__c';


export default class SpeakerList extends LightningElement {
    @api speakers;

    @wire(MessageContext) 
    messageContext;

    columns = [
        { label: 'Name', fieldName: 'Name' },
        { label: 'Speciality', fieldName: 'Speciality__c' },
        { label: 'Bio', fieldName: 'Bio__c' },
        { label: 'Level', fieldName: 'Level__c' },
        { type: 'button', typeAttributes:{
                                    label: 'Book Session',
                                    name: 'Select',
                                    title: 'Select',
                                    variant: 'brand',
                                    value: 'Select',
                                    iconPosition: 'right'
                                        
        }}
    ];

    handleBookSession(event){
        console.log('Book Session button is clicked');
        const speakerId = event.detail.row.Id;
        const speakerName = event.detail.row.Name;
        publish(this.messageContext, 
                SPEAKER_CHANNEL,{
                speakerId: speakerId,
                speakerName: speakerName,
                });
        console.log('published speakerId: '+speakerId + ' speakerName: '+speakerName);
    }
}