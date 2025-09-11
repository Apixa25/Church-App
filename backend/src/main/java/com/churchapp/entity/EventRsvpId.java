package com.churchapp.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventRsvpId implements Serializable {
    
    private UUID user;
    private UUID event;
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof EventRsvpId)) return false;
        
        EventRsvpId that = (EventRsvpId) o;
        
        if (!user.equals(that.user)) return false;
        return event.equals(that.event);
    }
    
    @Override
    public int hashCode() {
        int result = user.hashCode();
        result = 31 * result + event.hashCode();
        return result;
    }
}