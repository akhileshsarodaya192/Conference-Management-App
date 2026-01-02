public with sharing class SpeakerController {
    
    @AuraEnabled(cacheable=true)
public static List<Speaker__c> searchSpeakers(String name, String speciality) {

    String nameLike = '%' + name + '%';
    String specialityLike = '%' + speciality + '%';

    return [
        Select Id, Name, Email__c, Speciality__c, Bio__c 
        FROM Speaker__c 
        WHERE Name LIKE :nameLike 
        AND Speciality__c LIKE :specialityLike
        LIMIT 10
        ];
    }
    
    @AuraEnabled(cacheable=true)
    public static Boolean checkAvailability(Id speakerId, Date sessionDate) {
        if(speakerId == null || sessionDate == null) {
            return true;
        }
        
        Integer conflictCount = [
            SELECT COUNT()
            FROM Speaker_Assignment__c
            WHERE Speaker__c = :speakerId
            AND Session__r.Session_Date__c = :sessionDate
            LIMIT 10
            ];
        
        return conflictCount == 0;
    }

    @AuraEnabled
    public static Id createAssignment(Id speakerId, Date sessionDate) {
        Savepoint sp = Database.setSavepoint();
    
    try {
        Speaker__c speaker = [
            SELECT Id, Name, Speciality__c 
            FROM Speaker__c 
            WHERE Id = :speakerId LIMIT 1
        ];
        
        String sessionTitle = speaker.Speciality__c + ' - ' + 
                                sessionDate.format();
        
        Session__c newSession = new Session__c(
            Name = sessionTitle,
            Session_Date__c = sessionDate,
            Start_Time__c = Time.newInstance(10, 0, 0, 0),
            End_Time__c = Time.newInstance(11, 0, 0, 0),
            Level__c = 'Intermediate'
        );
        insert newSession;
        
        String assignmentName = speaker.Speciality__c + ' - ' + 
                                sessionDate.format() + ' - ' + 
                                speaker.Name;
        
        Speaker_Assignment__c assignment = new Speaker_Assignment__c(
            Name = assignmentName,         
            Speaker__c = speakerId,
            Session__c = newSession.Id
        );
        insert assignment;
        
        return assignment.Id;
        
    } catch (Exception e) {
        Database.rollback(sp);
        throw new AuraHandledException('Assignment creation failed: ' + e.getMessage());
    }
    }

    @AuraEnabled(cacheable=true)
public static List<Date> getBookedDates(Id speakerId) {
    List<Date> bookedDates = new List<Date>();
    
    List<Speaker_Assignment__c> assignments = [
        SELECT Session__r.Session_Date__c
        FROM Speaker_Assignment__c
        WHERE Speaker__c = :speakerId
    ];
    
    for(Speaker_Assignment__c sa : assignments) {
        if(sa.Session__r != null && 
            sa.Session__r.Session_Date__c != null && 
            sa.Session__r.Session_Date__c >= Date.today()) {
            bookedDates.add(sa.Session__r.Session_Date__c);
        }
    }
    
    return bookedDates;
}

    @AuraEnabled(cacheable=true)
    public static Map<String, Boolean> getCalendarAvailability(Id speakerId, Integer daysAhead) {
        Map<String, Boolean> availabilityMap = new Map<String, Boolean>();
        
        if(speakerId == null || daysAhead == null || daysAhead <= 0) {
            return availabilityMap;
        }
        
        Date startDate = Date.today().addDays(1); 
        
        for(Integer i = 0; i < daysAhead; i++) {
            Date checkDate = startDate.addDays(i);
            Boolean isAvailable = checkAvailability(speakerId, checkDate);
            availabilityMap.put(checkDate.format(), isAvailable);
        }
        
        return availabilityMap;
    }
    
    @AuraEnabled(cacheable=true)
    public static Speaker__c getSpeakerDetails(Id speakerId) {
        return [
                SELECT Id, Name, Email__c, Speciality__c, Bio__c 
                FROM Speaker__c 
                WHERE Id = :speakerId LIMIT 1
                ];
    }
}