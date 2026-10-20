package util;

/**
 * UNIT III: Exception Handling
 * Custom user-defined checked exception thrown when an invalid application status is supplied.
 */
public class InvalidStatusException extends Exception {

    public InvalidStatusException(String message) {
        super(message);
    }

    public InvalidStatusException(String message, Throwable cause) {
        super(message, cause);
    }
}
