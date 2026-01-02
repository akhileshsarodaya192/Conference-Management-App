import { LightningElement,track } from 'lwc';
import searchSpeakers from '@salesforce/apex/SpeakerController.searchSpeakers';

export default class SpeakerSearch extends LightningElement {

    name = '';
    speciality = '';
    @track speakers = [];

    specialityOptions =[{'label': 'Apex', 'value': 'Apex'},
                        {'label': 'LWC', 'value': 'LWC'},
                        {'label': 'Integrations', 'value': 'Integrations'},
                        {'label': 'Architecture', 'value': 'Architecture'}];

    handleNameSearch(event){
        this.name = event.target.value;
        console.log('Name: '+this.name);
    }

    handleSpecialitySearch(event){
        this.speciality = event.target.value;
        console.log('Speciality: '+this.speciality);
    }

    handleSearch() {
        console.log('After Apex Call --> Name: ' + this.name);
        console.log('After Apex Call --> Speciality: ' + this.speciality);

        searchSpeakers({ name: this.name, speciality: this.speciality })
            .then(result => {
                this.speakers = result;
            })
            .catch(error => {
                console.error(error);
            });
        console.log('After Apex Call --> Speakers: ' + this.speakers);
    }
}