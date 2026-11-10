using UnityEngine;

namespace OfficePrankster.AI
{
    /// <summary>
    /// Thuật toán Sàng lọc 3 Tầng (3-Stage Filtering) cho Tầm nhìn của Sếp (Enemy Field of View).
    /// Tầng 1: Khoảng cách (Distance) -> Tầng 2: Tích vô hướng (Dot Product) -> Tầng 3: Raycast Occlusion.
    /// </summary>
    public class BossFOV : MonoBehaviour
    {
        [Header("=== Cấu hình Hình nón Tầm nhìn ===")]
        [SerializeField] private float viewRadius = 8.5f;
        [Range(10f, 180f)]
        [SerializeField] private float viewAngle = 75f;
        [SerializeField] private Transform eyeOrigin;

        [Header("=== Layer Masks ===")]
        [SerializeField] private LayerMask obstacleMask;

        public float ViewRadius => viewRadius;
        public float ViewAngle => viewAngle;

        /// <summary>
        /// Kiểm tra xem người chơi có đang nằm trong tầm nhìn trực tiếp của Sếp hay không.
        /// Trả về tốc độ tăng thanh Nghi Ngờ (Suspicion Rate).
        /// </summary>
        public float EvaluatePlayerDetection(Transform playerTransform, bool isPlayerDoingSuspiciousAction, float rageMultiplier = 1f)
        {
            if (!isPlayerDoingSuspiciousAction || playerTransform == null) return 0f;

            Vector3 origin = eyeOrigin != null ? eyeOrigin.position : transform.position + Vector3.up * 1.6f;
            Vector3 target = playerTransform.position + Vector3.up * 1.2f;

            // --- TẦNG 1: Kiểm tra Khoảng cách (Distance Check) ---
            Vector3 toTarget = target - origin;
            toTarget.y = 0f; // Chiếu lên mặt phẳng ngang
            float distance = toTarget.magnitude;

            if (distance > viewRadius || distance < 0.01f) return 0f;

            // --- TẦNG 2: Kiểm tra Góc hình nón bằng Dot Product ---
            Vector3 dirToTarget = toTarget / distance;
            float dot = Vector3.Dot(transform.forward, dirToTarget);
            float cosHalfAngle = Mathf.Cos(viewAngle * 0.5f * Mathf.Deg2Rad);

            if (dot < cosHalfAngle) return 0f;

            // --- TẦNG 3: Kiểm tra Vật cản bằng Physics.Raycast ---
            Vector3 ray3D = (target - origin).normalized;
            if (Physics.Raycast(origin, ray3D, distance, obstacleMask))
            {
                return 0f; // Bị tường hoặc vách ngăn văn phòng che khuất
            }

            // Tính tốc độ tăng thanh Nghi Ngờ theo khoảng cách
            float proximityFactor = 1.2f - (distance / viewRadius);
            return 55f * proximityFactor * rageMultiplier;
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.color = new Color(1f, 0.8f, 0f, 0.4f);
            Gizmos.DrawWireSphere(transform.position, viewRadius);

            Vector3 leftBoundary = Quaternion.Euler(0, -viewAngle * 0.5f, 0) * transform.forward;
            Vector3 rightBoundary = Quaternion.Euler(0, viewAngle * 0.5f, 0) * transform.forward;

            Gizmos.color = Color.red;
            Gizmos.DrawLine(transform.position, transform.position + leftBoundary * viewRadius);
            Gizmos.DrawLine(transform.position, transform.position + rightBoundary * viewRadius);
        }
    }
}
