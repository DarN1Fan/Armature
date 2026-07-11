import { motion } from 'framer-motion'

function AnimationBone({ boneX = 0, boneY = 0, rotation = 0, scale = 1, x = 0, y = 0, showPivot = true, children }) {
  return (

    <motion.div
      style={{
        display: 'inline-block',
        transformOrigin: `${boneX}% ${boneY}%`,
        position: 'relative',
      }}
      animate={{
        rotate: rotation,
        scale: scale,
        x: x,
        y: y,
      }}
      transition={{ type: 'tween', duration:0 }}
    >
      {children}
      {showPivot && (
        <span style={{
            position: 'absolute',
            left: `${boneX}%`,
            top: `${boneY}%`,
            transform: 'translate(-50%, -50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#555',
            border: '1.5px solid #999',
            pointerEvents: 'none',
        }} />
      )}
    </motion.div>
  )
}

export default AnimationBone