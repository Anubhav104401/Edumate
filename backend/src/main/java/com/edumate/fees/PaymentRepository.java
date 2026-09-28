package com.edumate.fees;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Database access for payments. */
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByGatewayOrderId(String gatewayOrderId);

    /**
     * Loads the payment AND locks its row (SELECT ... FOR UPDATE) until the transaction ends.
     * If the gateway delivers the same callback twice at the same moment, the second delivery
     * waits here until the first has finished, then sees the payment already marked SUCCESS.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.gatewayOrderId = :orderId")
    Optional<Payment> findByGatewayOrderIdForUpdate(@Param("orderId") String orderId);

    List<Payment> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    List<Payment> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** Money already received against one bill. */
    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.feeDemandId = :demandId and p.status = 'SUCCESS'")
    BigDecimal sumPaidForDemand(@Param("demandId") Long demandId);
}
